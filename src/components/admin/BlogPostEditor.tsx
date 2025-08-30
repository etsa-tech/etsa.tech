"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { remark } from "remark";
import html from "remark-html";
import yaml from "js-yaml";

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
  published: z.boolean().optional(),
  rawYaml: z.string().optional(), // For manual YAML editing
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
    rawContent?: string; // Raw file content for multi-document YAML parsing
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
  readonly openPR?: {
    branchName: string;
    prNumber: number;
  } | null;
}

// Helper function to safely extract string values from frontmatter
function getStringValue(value: unknown, defaultValue = ""): string {
  return typeof value === "string" ? value : defaultValue;
}

// Helper function to generate slug from title
function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Helper function to parse multi-document YAML and extract the first document
function parseMultiDocumentYaml(content: string): {
  firstDocument: Record<string, unknown>;
  rawFirstDocument: string;
  remainingDocuments: string;
} {
  try {
    // Split by YAML document separators
    const documents = content.split(/^---\s*$/m);

    if (documents.length === 1) {
      // Single document
      const parsed = (yaml.load(content) as Record<string, unknown>) || {};
      return {
        firstDocument: parsed,
        rawFirstDocument: content.trim(),
        remainingDocuments: "",
      };
    }

    // Multi-document YAML
    const firstDocContent = documents[1]?.trim() || "";
    const remainingDocs = documents.slice(2).join("---\n").trim();

    const firstDocument =
      (yaml.load(firstDocContent) as Record<string, unknown>) || {};

    return {
      firstDocument,
      rawFirstDocument: firstDocContent,
      remainingDocuments: remainingDocs ? `---\n${remainingDocs}` : "",
    };
  } catch (error) {
    console.error("Error parsing multi-document YAML:", error);
    return {
      firstDocument: {},
      rawFirstDocument: "",
      remainingDocuments: "",
    };
  }
}

// Helper function to reconstruct the full YAML content
function reconstructYamlContent(
  formData: BlogPostFormData,
  rawYaml: string,
  _remainingDocuments: string, // For future multi-document support
): Record<string, unknown> {
  try {
    // If raw YAML is provided and valid, use it as the base
    if (rawYaml.trim()) {
      const parsedRaw = (yaml.load(rawYaml) as Record<string, unknown>) || {};

      // Override with form data for extracted fields
      const extractedFields: Record<string, unknown> = {
        title: formData.title,
        date: formData.date,
        excerpt: formData.excerpt,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        author: formData.author,
        published: formData.published,
      };

      // Add optional fields if they have values
      if (formData.speakerName)
        extractedFields.speakerName = formData.speakerName;
      if (formData.speakerTitle)
        extractedFields.speakerTitle = formData.speakerTitle;
      if (formData.speakerCompany)
        extractedFields.speakerCompany = formData.speakerCompany;
      if (formData.speakerBio) extractedFields.speakerBio = formData.speakerBio;
      if (formData.presentationTitle)
        extractedFields.presentationTitle = formData.presentationTitle;
      if (formData.presentationDescription)
        extractedFields.presentationDescription =
          formData.presentationDescription;
      if (formData.presentationSlides)
        extractedFields.presentationSlides = formData.presentationSlides;
      if (formData.recordingUrl)
        extractedFields.recordingUrl = formData.recordingUrl;
      if (formData.eventDate) extractedFields.eventDate = formData.eventDate;
      if (formData.eventLocation)
        extractedFields.eventLocation = formData.eventLocation;

      return { ...parsedRaw, ...extractedFields };
    }

    // Fallback to form data only
    return {
      title: formData.title,
      date: formData.date,
      excerpt: formData.excerpt,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      author: formData.author,
      published: formData.published,
      ...(formData.speakerName && { speakerName: formData.speakerName }),
      ...(formData.speakerTitle && { speakerTitle: formData.speakerTitle }),
      ...(formData.speakerCompany && {
        speakerCompany: formData.speakerCompany,
      }),
      ...(formData.speakerBio && { speakerBio: formData.speakerBio }),
      ...(formData.presentationTitle && {
        presentationTitle: formData.presentationTitle,
      }),
      ...(formData.presentationDescription && {
        presentationDescription: formData.presentationDescription,
      }),
      ...(formData.presentationSlides && {
        presentationSlides: formData.presentationSlides,
      }),
      ...(formData.recordingUrl && { recordingUrl: formData.recordingUrl }),
      ...(formData.eventDate && { eventDate: formData.eventDate }),
      ...(formData.eventLocation && { eventLocation: formData.eventLocation }),
    };
  } catch (error) {
    console.error("Error reconstructing YAML content:", error);
    // Fallback to basic form data
    return {
      title: formData.title,
      date: formData.date,
      excerpt: formData.excerpt,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      author: formData.author,
      published: formData.published,
    };
  }
}

// Helper function to process markdown preview
async function processMarkdownPreview(
  content: string,
  setPreview: (preview: string) => void,
): Promise<void> {
  if (!content) {
    setPreview("");
    return;
  }

  try {
    const contentWithBreaks = content.replace(/\n(?!\n)/g, "  \n");
    const processedContent = await remark()
      .use(html)
      .process(contentWithBreaks);
    setPreview(processedContent.toString());
  } catch (error) {
    console.error("Error processing markdown:", error);
    setPreview("Error processing markdown");
  }
}

// Branch Status Indicator Component
interface BranchStatusIndicatorProps {
  readonly currentBranch: string;
  readonly viewingBranch?: string;
  readonly isUpdateBranchForThisPost: boolean;
  readonly isUpdateBranchForOtherPost: boolean;
  readonly openPR?: {
    branchName: string;
    prNumber: number;
  } | null;
}

function BranchStatusIndicator({
  currentBranch,
  viewingBranch,
  isUpdateBranchForThisPost,
  isUpdateBranchForOtherPost,
  openPR,
}: BranchStatusIndicatorProps) {
  // When viewing content from a different branch (like a PR branch)
  if (viewingBranch && viewingBranch !== currentBranch) {
    const saveToBranch = viewingBranch; // Save to the branch we're viewing, not currentBranch

    return (
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
                  {saveToBranch}
                </code>
                {openPR && (
                  <span className="ml-2">(PR #{openPR.prNumber})</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    isUpdateBranchForThisPost &&
    (!viewingBranch || viewingBranch === currentBranch)
  ) {
    return (
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
    );
  }

  if (isUpdateBranchForOtherPost) {
    return (
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
    );
  }

  return null;
}

// Action Buttons Component
interface ActionButtonsProps {
  readonly isUpdateBranchForThisPost: boolean;
  readonly isMainBranch: boolean;
  readonly isUpdateBranchForOtherPost: boolean;
  readonly isLoading?: boolean;
  readonly onSaveDraft: () => void;
  readonly onCreatePR: () => void;
  readonly viewingBranch?: string;
  readonly currentBranch: string;
  readonly openPR?: {
    branchName: string;
    prNumber: number;
  } | null;
}

function ActionButtons({
  isUpdateBranchForThisPost,
  isMainBranch,
  isUpdateBranchForOtherPost,
  isLoading,
  onSaveDraft,
  onCreatePR,
  viewingBranch,
  currentBranch,
  openPR,
}: ActionButtonsProps) {
  // Determine if we're viewing a PR branch (different from current branch)
  const isViewingPRBranch = viewingBranch && viewingBranch !== currentBranch;

  return (
    <div className="flex justify-end space-x-3">
      {/* View PR button - show when there's an open PR */}
      {openPR && (
        <a
          href={`https://github.com/etsa-tech/etsa.tech/pull/${openPR.prNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          View PR #{openPR.prNumber}
        </a>
      )}

      {/* Save to branch button - show when viewing a PR branch or on update branch */}
      {(isUpdateBranchForThisPost || isViewingPRBranch) && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
        >
          {isLoading
            ? "Saving..."
            : `Save to ${isViewingPRBranch ? viewingBranch : "branch"}`}
        </button>
      )}

      {/* Create PR button - only show on main branch when not viewing a different branch */}
      {isMainBranch && !isViewingPRBranch && (
        <button
          type="button"
          onClick={onCreatePR}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
        >
          {isLoading ? "Creating PR..." : "Create Pull Request"}
        </button>
      )}

      {/* Disabled state for wrong branch */}
      {isUpdateBranchForOtherPost && (
        <div className="text-center">
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
            You&apos;re on an update branch for a different post. Switch to main
            branch to edit this post.
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
  );
}

// Helper function to create default form values
function createDefaultValues(
  initialData?: BlogPostEditorProps["initialData"],
): BlogPostFormData {
  const frontmatter = initialData?.frontmatter;

  return {
    title: getStringValue(frontmatter?.title),
    date: getStringValue(
      frontmatter?.date,
      new Date().toISOString().split("T")[0],
    ),
    excerpt: getStringValue(frontmatter?.excerpt),
    tags: Array.isArray(frontmatter?.tags) ? frontmatter.tags.join(", ") : "",
    author: getStringValue(frontmatter?.author),
    speakerName: getStringValue(frontmatter?.speakerName),
    speakerTitle: getStringValue(frontmatter?.speakerTitle),
    speakerCompany: getStringValue(frontmatter?.speakerCompany),
    speakerBio: getStringValue(frontmatter?.speakerBio),
    presentationTitle: getStringValue(frontmatter?.presentationTitle),
    presentationDescription: getStringValue(
      frontmatter?.presentationDescription,
    ),
    presentationSlides: getStringValue(frontmatter?.presentationSlides),
    recordingUrl: getStringValue(frontmatter?.recordingUrl),
    eventDate: getStringValue(frontmatter?.eventDate),
    eventLocation: getStringValue(frontmatter?.eventLocation),
    published: frontmatter?.published !== false,
    rawYaml: "", // Will be populated from the raw frontmatter content
  };
}

export default function BlogPostEditor({
  initialData,
  onSave,
  isLoading,
  currentBranch = "main",
  viewingBranch,
  openPR,
}: Readonly<BlogPostEditorProps>) {
  const [content, setContent] = useState(initialData?.content || "");
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [rawYaml, setRawYaml] = useState("");
  const [remainingDocuments, setRemainingDocuments] = useState("");
  const [showYamlEditor, setShowYamlEditor] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: createDefaultValues(initialData),
  });

  const title = watch("title");

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !initialData?.slug) {
      setSlug(generateSlugFromTitle(title));
    }
  }, [title, initialData?.slug]);

  // Update preview when content changes
  useEffect(() => {
    processMarkdownPreview(content, setPreview);
  }, [content]);

  // Initialize raw YAML from raw content when component loads
  useEffect(() => {
    if (initialData?.rawContent) {
      try {
        // Parse multi-document YAML from raw content
        const { rawFirstDocument, remainingDocuments: remaining } =
          parseMultiDocumentYaml(initialData.rawContent);
        setRawYaml(rawFirstDocument);
        setRemainingDocuments(remaining);
      } catch (error) {
        console.error("Error parsing multi-document YAML:", error);
        // Fallback to converting frontmatter to YAML
        if (initialData?.frontmatter) {
          const yamlString = yaml.dump(initialData.frontmatter, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
          });
          setRawYaml(yamlString);
        }
      }
    } else if (initialData?.frontmatter) {
      // Fallback for when rawContent is not available
      try {
        const yamlString = yaml.dump(initialData.frontmatter, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        });
        setRawYaml(yamlString);
      } catch (error) {
        console.error("Error converting frontmatter to YAML:", error);
        setRawYaml("");
      }
    }
  }, [initialData?.rawContent, initialData?.frontmatter]);

  // Determine if we're on an update branch for THIS specific post
  const isUpdateBranchForThisPost = currentBranch.startsWith(
    `update-post-${slug}-`,
  );
  const isUpdateBranchForOtherPost =
    currentBranch.startsWith("update-post-") && !isUpdateBranchForThisPost;
  const isMainBranch = currentBranch === "main";

  const onSubmit = async (data: BlogPostFormData, createPR: boolean = true) => {
    // Use the YAML reconstruction function to preserve format and handle multi-document YAML
    const frontmatter = reconstructYamlContent(
      data,
      rawYaml,
      remainingDocuments,
    );

    await onSave({
      slug,
      frontmatter,
      content,
      createPR,
    });
  };

  return (
    <div className="space-y-6">
      <BranchStatusIndicator
        currentBranch={currentBranch}
        viewingBranch={viewingBranch}
        isUpdateBranchForThisPost={isUpdateBranchForThisPost}
        isUpdateBranchForOtherPost={isUpdateBranchForOtherPost}
        openPR={openPR}
      />

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

        {/* Advanced YAML Editor */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Advanced YAML Editor
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Edit the raw YAML frontmatter. Changes here will override form
                fields above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowYamlEditor(!showYamlEditor)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary"
            >
              {showYamlEditor ? "Hide YAML" : "Show YAML"}
            </button>
          </div>

          {showYamlEditor && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex">
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
                      Advanced Editor
                    </h3>
                    <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                      <p>
                        This editor shows the first YAML document from
                        frontmatter. Fields edited in the form above will
                        override values here when saving. Use this for complex
                        fields not available in the form.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  YAML Frontmatter (First Document)
                </label>
                <MonacoEditor
                  height="300px"
                  defaultLanguage="yaml"
                  value={rawYaml}
                  onChange={(value) => setRawYaml(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: "on",
                    wordWrap: "on",
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          )}
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

        <ActionButtons
          isUpdateBranchForThisPost={isUpdateBranchForThisPost}
          isMainBranch={isMainBranch}
          isUpdateBranchForOtherPost={isUpdateBranchForOtherPost}
          isLoading={isLoading}
          onSaveDraft={() => handleSubmit((data) => onSubmit(data, false))()}
          onCreatePR={() => handleSubmit((data) => onSubmit(data, true))()}
          viewingBranch={viewingBranch}
          currentBranch={currentBranch}
          openPR={openPR}
        />
      </form>
    </div>
  );
}
