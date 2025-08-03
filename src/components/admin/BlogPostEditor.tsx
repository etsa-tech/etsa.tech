"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { remark } from "remark";
import html from "remark-html";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md" />
  ),
});

const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  excerpt: z.string().min(1, "Excerpt is required"),
  tags: z.string().min(1, "At least one tag is required"),
  author: z.string().min(1, "Author is required"),
  speakerName: z.string().optional(),
  speakerTitle: z.string().optional(),
  speakerCompany: z.string().optional(),
  speakerBio: z.string().optional(),
  presentationTitle: z.string().optional(),
  presentationDescription: z.string().optional(),
  presentationSlides: z.string().optional(),
  recordingUrl: z.string().optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

interface BlogPostFrontmatter {
  title?: string;
  date?: string;
  excerpt?: string;
  tags?: string[];
  speakers?: Array<{
    name: string;
    title?: string;
    company?: string;
    bio?: string;
  }>;
  speakerName?: string;
  speakerTitle?: string;
  speakerCompany?: string;
  speakerBio?: string;
  presentationSlides?: string;
  recordingUrl?: string;
  [key: string]: unknown;
}

interface BlogPostEditorProps {
  readonly initialData?: {
    slug: string;
    frontmatter: BlogPostFrontmatter;
    content: string;
  };
  readonly onSave: (data: {
    slug: string;
    frontmatter: BlogPostFrontmatter;
    content: string;
    createPR: boolean;
  }) => Promise<void>;
  readonly isLoading?: boolean;
  readonly currentBranch?: string;
  readonly viewingBranch?: string;
}

export default function BlogPostEditor({
  initialData,
  onSave,
  isLoading,
  currentBranch = "main",
  viewingBranch,
}: Readonly<BlogPostEditorProps>) {
  const [content, setContent] = useState(initialData?.content || "");
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [slug, setSlug] = useState(initialData?.slug || "");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: String(initialData?.frontmatter?.title || ""),
      date: String(
        initialData?.frontmatter?.date ||
          new Date().toISOString().split("T")[0],
      ),
      excerpt: String(initialData?.frontmatter?.excerpt || ""),
      tags: Array.isArray(initialData?.frontmatter?.tags)
        ? initialData.frontmatter.tags.join(", ")
        : "",
      author:
        typeof initialData?.frontmatter?.author === "string"
          ? initialData.frontmatter.author
          : "",
      speakerName:
        typeof initialData?.frontmatter?.speakerName === "string"
          ? initialData.frontmatter.speakerName
          : "",
      speakerTitle:
        typeof initialData?.frontmatter?.speakerTitle === "string"
          ? initialData.frontmatter.speakerTitle
          : "",
      speakerCompany:
        typeof initialData?.frontmatter?.speakerCompany === "string"
          ? initialData.frontmatter.speakerCompany
          : "",
      speakerBio:
        typeof initialData?.frontmatter?.speakerBio === "string"
          ? initialData.frontmatter.speakerBio
          : "",
      presentationTitle:
        typeof initialData?.frontmatter?.presentationTitle === "string"
          ? initialData.frontmatter.presentationTitle
          : "",
      presentationDescription:
        typeof initialData?.frontmatter?.presentationDescription === "string"
          ? initialData.frontmatter.presentationDescription
          : "",
      presentationSlides:
        typeof initialData?.frontmatter?.presentationSlides === "string"
          ? initialData.frontmatter.presentationSlides
          : "",
      recordingUrl:
        typeof initialData?.frontmatter?.recordingUrl === "string"
          ? initialData.frontmatter.recordingUrl
          : "",
      eventDate:
        typeof initialData?.frontmatter?.eventDate === "string"
          ? initialData.frontmatter.eventDate
          : "",
      eventLocation:
        typeof initialData?.frontmatter?.eventLocation === "string"
          ? initialData.frontmatter.eventLocation
          : "",
      featured: Boolean(initialData?.frontmatter?.featured),
      published: initialData?.frontmatter?.published !== false,
    },
  });

  const title = watch("title");

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !initialData?.slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setSlug(generatedSlug);
    }
  }, [title, initialData?.slug]);

  // Update preview when content changes
  useEffect(() => {
    const updatePreview = async () => {
      if (content) {
        try {
          // Pre-process content to handle line breaks better
          const contentWithBreaks = content.replace(/\n(?!\n)/g, "  \n");
          const processedContent = await remark()
            .use(html)
            .process(contentWithBreaks);
          setPreview(processedContent.toString());
        } catch (error) {
          console.error("Error processing markdown:", error);
          setPreview("Error processing markdown");
        }
      } else {
        setPreview("");
      }
    };

    updatePreview();
  }, [content]);

  // Determine if we're on an update branch for THIS specific post
  const isUpdateBranchForThisPost = currentBranch.startsWith(
    `update-post-${slug}-`,
  );
  const isUpdateBranchForOtherPost =
    currentBranch.startsWith("update-post-") && !isUpdateBranchForThisPost;
  const isMainBranch = currentBranch === "main";

  const onSubmit = async (data: BlogPostFormData, createPR: boolean = true) => {
    const frontmatter = {
      ...data,
      tags: data.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    await onSave({
      slug,
      frontmatter,
      content,
      createPR,
    });
  };

  return (
    <div className="space-y-6">
      {/* Branch Status Indicator */}
      {viewingBranch && viewingBranch !== currentBranch && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Viewing content from different branch
              </h3>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                <p>
                  Viewing:{" "}
                  <code className="bg-amber-100 dark:bg-amber-800 px-1 py-0.5 rounded text-xs">
                    {viewingBranch}
                  </code>
                  {" • Changes will be saved to: "}
                  <code className="bg-amber-100 dark:bg-amber-800 px-1 py-0.5 rounded text-xs">
                    {currentBranch}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isUpdateBranchForThisPost &&
        (!viewingBranch || viewingBranch === currentBranch) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Working on update branch for this post
                </h3>
                <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Branch:{" "}
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-xs">
                      {currentBranch}
                    </code>
                    {" • Changes will be saved as draft to this branch"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      {isUpdateBranchForOtherPost && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Wrong branch for this post
              </h3>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                <p>
                  You&apos;re on:{" "}
                  <code className="bg-amber-100 dark:bg-amber-800 px-1 py-0.5 rounded text-xs">
                    {currentBranch}
                  </code>
                  {
                    " • This branch is for a different post. Switch to main branch to edit this post."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Title *
              </label>
              <input
                id="title"
                type="text"
                {...register("title")}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Slug
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Date *
              </label>
              <input
                id="date"
                type="date"
                {...register("date")}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.date.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="author"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Author *
              </label>
              <input
                id="author"
                type="text"
                {...register("author")}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
              {errors.author && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.author.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="excerpt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Excerpt *
            </label>
            <textarea
              id="excerpt"
              rows={3}
              {...register("excerpt")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
            />
            {errors.excerpt && (
              <p className="mt-1 text-sm text-red-600">
                {errors.excerpt.message}
              </p>
            )}
          </div>

          <div className="mt-6">
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Tags * (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              {...register("tags")}
              placeholder="React, JavaScript, Web Development"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
            />
            {errors.tags && (
              <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
            )}
          </div>

          <div className="mt-6 flex items-center space-x-6">
            <div className="flex items-center">
              <input
                id="featured"
                type="checkbox"
                {...register("featured")}
                className="h-4 w-4 text-etsa-primary focus:ring-etsa-primary border-gray-300 rounded"
              />
              <label
                htmlFor="featured"
                className="ml-2 block text-sm text-gray-900 dark:text-white"
              >
                Featured post
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="published"
                type="checkbox"
                {...register("published")}
                className="h-4 w-4 text-etsa-primary focus:ring-etsa-primary border-gray-300 rounded"
              />
              <label
                htmlFor="published"
                className="ml-2 block text-sm text-gray-900 dark:text-white"
              >
                Published
              </label>
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Content
            </h3>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>

          <div
            className={`grid gap-6 ${
              showPreview ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            <div>
              <MonacoEditor
                height="500px"
                defaultLanguage="markdown"
                value={content}
                onChange={(value) => setContent(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>

            {showPreview && (
              <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-gray-50 dark:bg-gray-900 overflow-auto max-h-[500px]">
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {isUpdateBranchForThisPost && (
            <button
              type="button"
              onClick={() => handleSubmit((data) => onSubmit(data, false))()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Draft"}
            </button>
          )}
          {isMainBranch && (
            <button
              type="button"
              onClick={() => handleSubmit((data) => onSubmit(data, true))()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
            >
              {isLoading ? "Creating PR..." : "Create Pull Request"}
            </button>
          )}
          {isUpdateBranchForOtherPost && (
            <div className="text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                You&apos;re on an update branch for a different post. Switch to
                main branch to edit this post.
              </p>
              <button
                type="button"
                disabled
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-400 bg-gray-100 cursor-not-allowed"
              >
                Switch to Main Branch First
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
