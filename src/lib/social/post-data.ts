import "server-only";
import matter from "gray-matter";
import { getBlogPost } from "@/lib/github";
import { getSocialContentFields } from "@/lib/utils";
import type { PostFrontmatter } from "@/types/post";

// Social mailings only ever go out for published posts on main - there's no
// scenario for announcing a post that's still on a draft PR branch.
export async function getPublishedPostFrontmatter(
  slug: string,
): Promise<PostFrontmatter> {
  const rawContent = await getBlogPost(slug, "main");
  const { data } = matter(rawContent);
  return data as PostFrontmatter;
}

export async function getSocialDraftContent(slug: string) {
  const frontmatter = await getPublishedPostFrontmatter(slug);
  return {
    title: frontmatter.title,
    ...getSocialContentFields(frontmatter),
  };
}
