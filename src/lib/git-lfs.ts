import { createHash } from "crypto";

/**
 * Minimal Git LFS client for uploading binary assets through GitHub's
 * Git LFS Batch API (https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md).
 *
 * The GitHub REST "contents" API (octokit.repos.createOrUpdateFileContents)
 * commits raw file bytes as a normal git blob — it has no concept of the
 * `filter=lfs` clean/smudge filters declared in .gitattributes, since those
 * only run in a local git working tree. To actually store a file via LFS
 * when uploading through the API, we have to speak the LFS protocol
 * ourselves: upload the object's bytes to GitHub's LFS storage, then commit
 * a small text "pointer file" (not the binary) via the contents API.
 */

// Extensions tracked with `filter=lfs` in .gitattributes. Keep this in sync
// with that file.
const LFS_TRACKED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "pdf",
  "webp",
  "svg",
  "pptx",
  "ppt",
  "docx",
  "doc",
]);

export function isLfsTrackedFilename(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return !!ext && LFS_TRACKED_EXTENSIONS.has(ext);
}

interface LfsBatchAction {
  href: string;
  header?: Record<string, string>;
}

interface LfsBatchObject {
  oid: string;
  size: number;
  actions?: {
    upload?: LfsBatchAction;
    verify?: LfsBatchAction;
  };
  error?: { code: number; message: string };
}

interface LfsBatchResponse {
  objects: LfsBatchObject[];
}

/**
 * Builds the plain-text pointer file that should be committed to the repo
 * in place of the binary, per the Git LFS pointer file spec.
 */
export function buildLfsPointer(oid: string, size: number): string {
  return `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${size}\n`;
}

/**
 * Uploads a file's bytes to a GitHub repo's Git LFS storage and returns the
 * pointer file text that should be committed to the repo path instead of
 * the raw binary.
 *
 * @param owner GitHub repo owner
 * @param repo GitHub repo name
 * @param token A GitHub token with push access to the repo (e.g. a GitHub
 *   App installation token). Authenticated the same way `git` authenticates
 *   over HTTPS with an installation token: HTTP Basic auth with
 *   "x-access-token" as the username.
 * @param buffer Raw file contents
 */
export async function uploadFileToLfs(
  owner: string,
  repo: string,
  token: string,
  buffer: Buffer,
): Promise<string> {
  const oid = createHash("sha256").update(buffer).digest("hex");
  const size = buffer.length;

  const authHeader =
    "Basic " + Buffer.from(`x-access-token:${token}`).toString("base64");

  const batchUrl = `https://github.com/${owner}/${repo}.git/info/lfs/objects/batch`;
  const batchResponse = await fetch(batchUrl, {
    method: "POST",
    headers: {
      Accept: "application/vnd.git-lfs+json",
      "Content-Type": "application/vnd.git-lfs+json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      operation: "upload",
      transfers: ["basic"],
      objects: [{ oid, size }],
    }),
  });

  if (!batchResponse.ok) {
    throw new Error(
      `Git LFS batch request failed: ${
        batchResponse.status
      } ${await batchResponse.text()}`,
    );
  }

  const batchData = (await batchResponse.json()) as LfsBatchResponse;
  const object = batchData.objects?.[0];

  if (!object) {
    throw new Error("Git LFS batch response did not include the object");
  }
  if (object.error) {
    throw new Error(
      `Git LFS batch error for oid ${oid}: ${object.error.code} ${object.error.message}`,
    );
  }

  const uploadAction = object.actions?.upload;
  if (uploadAction) {
    const uploadResponse = await fetch(uploadAction.href, {
      method: "PUT",
      headers: {
        ...uploadAction.header,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Git LFS object upload failed: ${
          uploadResponse.status
        } ${await uploadResponse.text()}`,
      );
    }

    const verifyAction = object.actions?.verify;
    if (verifyAction) {
      const verifyResponse = await fetch(verifyAction.href, {
        method: "POST",
        headers: {
          ...verifyAction.header,
          Accept: "application/vnd.git-lfs+json",
          "Content-Type": "application/vnd.git-lfs+json",
        },
        body: JSON.stringify({ oid, size }),
      });

      if (!verifyResponse.ok) {
        throw new Error(
          `Git LFS object verify failed: ${
            verifyResponse.status
          } ${await verifyResponse.text()}`,
        );
      }
    }
  }
  // If there's no upload action, GitHub already has this object stored
  // (content-addressed by oid), so there's nothing left to upload.

  return buildLfsPointer(oid, size);
}

/**
 * Prepares the base64 content to pass to
 * octokit.rest.repos.createOrUpdateFileContents for a given upload: an LFS
 * pointer file for extensions tracked in .gitattributes, or the raw file
 * bytes otherwise.
 */
export async function getCommitContent(
  owner: string,
  repo: string,
  token: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  if (!isLfsTrackedFilename(filename)) {
    return buffer.toString("base64");
  }

  const pointer = await uploadFileToLfs(owner, repo, token, buffer);
  return Buffer.from(pointer).toString("base64");
}
