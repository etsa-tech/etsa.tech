import {
  isLfsTrackedFilename,
  buildLfsPointer,
  uploadFileToLfs,
  getCommitContent,
} from "@/lib/git-lfs";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("isLfsTrackedFilename", () => {
  it.each(["a.png", "a.JPG", "a.pdf", "a.pptx"])(
    "treats %s as LFS-tracked",
    (name) => {
      expect(isLfsTrackedFilename(name)).toBe(true);
    },
  );

  it("treats an untracked extension as not LFS-tracked", () => {
    expect(isLfsTrackedFilename("a.md")).toBe(false);
  });

  it("treats a file with no extension as not LFS-tracked", () => {
    expect(isLfsTrackedFilename("README")).toBe(false);
  });
});

describe("buildLfsPointer", () => {
  it("formats the pointer per the LFS spec", () => {
    expect(buildLfsPointer("abc123", 42)).toBe(
      "version https://git-lfs.github.com/spec/v1\noid sha256:abc123\nsize 42\n",
    );
  });
});

function fetchSequence(
  ...responses: Array<
    Partial<Response> & { json?: () => unknown; text?: () => unknown }
  >
) {
  const fn = jest.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn as unknown as typeof fetch;
}

describe("uploadFileToLfs", () => {
  const buffer = Buffer.from("hello world");

  it("uploads and verifies when the batch response includes an upload action", async () => {
    global.fetch = fetchSequence(
      {
        ok: true,
        json: async () => ({
          objects: [
            {
              oid: "deadbeef",
              size: buffer.length,
              actions: {
                upload: { href: "https://lfs.example/upload" },
                verify: { href: "https://lfs.example/verify" },
              },
            },
          ],
        }),
      },
      { ok: true },
      { ok: true },
    );

    const pointer = await uploadFileToLfs("owner", "repo", "token", buffer);
    expect(pointer).toContain("oid sha256:");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("skips upload/verify when the object already exists (no actions)", async () => {
    global.fetch = fetchSequence({
      ok: true,
      json: async () => ({
        objects: [{ oid: "deadbeef", size: buffer.length }],
      }),
    });

    await uploadFileToLfs("owner", "repo", "token", buffer);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws when the batch request itself fails", async () => {
    global.fetch = fetchSequence({
      ok: false,
      status: 500,
      text: async () => "server error",
    });
    await expect(uploadFileToLfs("o", "r", "t", buffer)).rejects.toThrow(
      /batch request failed/,
    );
  });

  it("throws when the batch response has no objects", async () => {
    global.fetch = fetchSequence({
      ok: true,
      json: async () => ({ objects: [] }),
    });
    await expect(uploadFileToLfs("o", "r", "t", buffer)).rejects.toThrow(
      /did not include the object/,
    );
  });

  it("throws when the batch object carries an error", async () => {
    global.fetch = fetchSequence({
      ok: true,
      json: async () => ({
        objects: [{ oid: "x", size: 1, error: { code: 422, message: "nope" } }],
      }),
    });
    // The error message embeds the sha256 of the uploaded buffer (computed
    // locally), not the mocked response object's oid field.
    await expect(uploadFileToLfs("o", "r", "t", buffer)).rejects.toThrow(
      /batch error for oid [0-9a-f]{64}: 422 nope/,
    );
  });

  it("throws when the upload PUT fails", async () => {
    global.fetch = fetchSequence(
      {
        ok: true,
        json: async () => ({
          objects: [
            {
              oid: "x",
              size: buffer.length,
              actions: { upload: { href: "https://lfs.example/upload" } },
            },
          ],
        }),
      },
      { ok: false, status: 500, text: async () => "upload failed" },
    );
    await expect(uploadFileToLfs("o", "r", "t", buffer)).rejects.toThrow(
      /object upload failed/,
    );
  });

  it("uploads but skips verification when the batch response has no verify action", async () => {
    global.fetch = fetchSequence(
      {
        ok: true,
        json: async () => ({
          objects: [
            {
              oid: "x",
              size: buffer.length,
              actions: { upload: { href: "https://lfs.example/upload" } },
            },
          ],
        }),
      },
      { ok: true },
    );
    const pointer = await uploadFileToLfs("o", "r", "t", buffer);
    expect(pointer).toContain("oid sha256:");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when verify fails", async () => {
    global.fetch = fetchSequence(
      {
        ok: true,
        json: async () => ({
          objects: [
            {
              oid: "x",
              size: buffer.length,
              actions: {
                upload: { href: "https://lfs.example/upload" },
                verify: { href: "https://lfs.example/verify" },
              },
            },
          ],
        }),
      },
      { ok: true },
      { ok: false, status: 500, text: async () => "verify failed" },
    );
    await expect(uploadFileToLfs("o", "r", "t", buffer)).rejects.toThrow(
      /object verify failed/,
    );
  });
});

describe("getCommitContent", () => {
  it("base64-encodes raw bytes for a non-LFS-tracked filename", async () => {
    const buffer = Buffer.from("hello");
    const content = await getCommitContent("o", "r", "t", "notes.md", buffer);
    expect(content).toBe(buffer.toString("base64"));
  });

  it("uploads to LFS and returns the base64 pointer for a tracked filename", async () => {
    const buffer = Buffer.from("binary-data");
    global.fetch = fetchSequence({
      ok: true,
      json: async () => ({
        objects: [{ oid: "deadbeef", size: buffer.length }],
      }),
    });
    const content = await getCommitContent("o", "r", "t", "image.png", buffer);
    const decoded = Buffer.from(content, "base64").toString();
    expect(decoded).toContain("oid sha256:");
  });
});
