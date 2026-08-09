import "server-only";
import { createBranch, getBranches, getFileContentWithSha } from "@/lib/github";
import { sanitizeForBranchName } from "@/lib/utils";

// Finds an existing update branch for this post (old and new naming
// patterns, for backward compatibility) or creates a new fix/ branch, and
// returns the file SHA to update against. Shared by every route that needs
// to commit a change to a post via a PR (the post editor, and the LinkedIn
// "promote to frontmatter" action).
export async function resolveBranchForEdit(
  slug: string,
  title: string,
): Promise<{ branchName: string; fileSha: string; sanitizedTitle: string }> {
  const sanitizedTitle = sanitizeForBranchName(title);

  const allBranches = await getBranches();
  const updateBranchPattern = `update-post-${slug}-`;
  const newPostBranchPattern = `new-post-${slug}-`;
  const datePrefix = slug.split("-").slice(0, 3).join("-");
  const featureBranchPattern = `feature/${datePrefix}-`;
  const fixBranchPattern = `fix/${sanitizedTitle}`;
  const choreBranchPattern = `chore/${sanitizedTitle}`;

  const existingBranch = allBranches.find(
    (branch) =>
      branch.startsWith(updateBranchPattern) ||
      branch.startsWith(newPostBranchPattern) ||
      branch.startsWith(featureBranchPattern) ||
      branch === fixBranchPattern ||
      branch === choreBranchPattern,
  );

  if (existingBranch) {
    console.log(`Using existing branch: ${existingBranch}`);
    try {
      const fileData = await getFileContentWithSha(
        `posts/${slug}.md`,
        existingBranch,
      );
      return {
        branchName: existingBranch,
        fileSha: fileData.sha,
        sanitizedTitle,
      };
    } catch {
      // File doesn't exist yet in this branch - fall back to main's SHA.
      const fileData = await getFileContentWithSha(`posts/${slug}.md`, "main");
      return {
        branchName: existingBranch,
        fileSha: fileData.sha,
        sanitizedTitle,
      };
    }
  }

  const branchName = `fix/${sanitizedTitle}`;
  console.log(`Creating new fix branch: ${branchName}`);
  await createBranch(branchName);
  const fileData = await getFileContentWithSha(`posts/${slug}.md`, "main");
  return { branchName, fileSha: fileData.sha, sanitizedTitle };
}
