"use client";

import { useState, useEffect, useCallback } from "react";
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
  eventLocationName: z.string().optional(),
  eventLocationAddress: z.string().optional(),
  eventLocationLat: z.string().optional(),
  eventLocationLng: z.string().optional(),
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
  eventDate?: string;
  eventLocation?: {
    name?: string;
    address?: string;
    coordinates?: {
      lat?: string;
      lng?: string;
    };
  };
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
  readonly onPRCreated?: (prInfo: {
    prNumber: number;
    branchName: string;
    isNew: boolean;
  }) => void;
}

// Helper function to safely extract string values from frontmatter
function getStringValue(value: unknown, defaultValue = ""): string {
  return typeof value === "string" ? value : defaultValue;
}

// Helper function to generate slug from date and title (ETSA format: YYYY-MM-DD-Title)
function generateSlugFromDateAndTitle(date: string, title: string): string {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return date ? `${date}-${titleSlug}` : titleSlug;
}

// Default meeting location (from meeting-info page)
const DEFAULT_LOCATION = {
  name: "Knoxville Entrepreneur Center",
  address: "17 Market Square SUITE 101, Knoxville, TN 37902",
  coordinates: {
    lat: "35.965179",
    lng: "-83.919846",
  },
};

// Helper function to get first Tuesday of next month
function getFirstTuesdayOfNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Find the first Tuesday (day 2, where Sunday = 0)
  const firstTuesday = new Date(nextMonth);
  const dayOfWeek = nextMonth.getDay();
  const daysToAdd =
    dayOfWeek === 0 ? 2 : dayOfWeek <= 2 ? 2 - dayOfWeek : 9 - dayOfWeek;
  firstTuesday.setDate(nextMonth.getDate() + daysToAdd);

  return firstTuesday.toISOString().split("T")[0];
}

// Google Maps integration function (server-side API call)
async function searchGoogleMaps(query: string): Promise<{
  name: string;
  address: string;
  lat: string;
  lng: string;
} | null> {
  try {
    console.log(`Searching for location: ${query}`);

    const response = await fetch(
      `/api/admin/google-maps/search?query=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log("No results found for:", query);
        return null;
      }
      throw new Error(`Search failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("Search result:", result);

    return result;
  } catch (error) {
    console.error("Error searching Google Maps:", error);
    return null;
  }
}

// Helper function to generate default YAML template with live data (ETSA format)
function generateDefaultYamlTemplate(formData: BlogPostFormData): string {
  const tagsArray = formData.tags
    ? formData.tags
        .split(",")
        .map((tag) => `  - ${tag.trim()}`)
        .join("\n")
    : `  - Tag 1
  - Tag 2
  - Tag 3`;

  const yaml = `title: ${formData.title || "Your Post Title"}
date: ${formData.date || new Date().toISOString().split("T")[0]}
excerpt: >-
  ${
    formData.excerpt ||
    "Brief description of your post content and what attendees will learn."
  }
tags:
${tagsArray}
author: ${formData.author || "ETSA"}
speakers:
  - name: ${formData.speakerName || "Speaker Name"}
    title: ${formData.speakerTitle || "Speaker Title"}
    company: ${formData.speakerCompany || "Company Name"}
    image: /images/speakers/${
      formData.speakerName
        ? formData.speakerName.toLowerCase().replace(/\s+/g, "_")
        : "speaker_name"
    }.jpeg
    bio: >-
      ${
        formData.speakerBio ||
        "Brief speaker biography highlighting their experience and expertise."
      }
    linkedIn: https://www.linkedin.com/in/speaker-profile/
presentationSlides: ${formData.presentationSlides || "slides.pdf"}
eventDate: ${formData.eventDate || getFirstTuesdayOfNextMonth()}
eventLocation:
  name: ${formData.eventLocationName || DEFAULT_LOCATION.name}
  address: ${formData.eventLocationAddress || DEFAULT_LOCATION.address}
  coordinates:
    lat: "${formData.eventLocationLat || DEFAULT_LOCATION.coordinates.lat}"
    lng: "${formData.eventLocationLng || DEFAULT_LOCATION.coordinates.lng}"
published: ${formData.published}`;

  return yaml;
}

// Helper function to generate slug from title only (fallback)
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
  remainingDocuments: string, // Used in onSubmit function for multi-document YAML support
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
    // If there's an open PR and we're viewing main, save to PR branch
    const saveToBranch =
      openPR && viewingBranch === "main" ? openPR.branchName : viewingBranch;

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
          {isLoading ? "Saving..." : "Save to branch"}
        </button>
      )}

      {/* Save to PR button - show when there's an open PR and we're on main branch */}
      {openPR && isMainBranch && !isViewingPRBranch && (
        <button
          type="button"
          onClick={onCreatePR}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save to PR"}
        </button>
      )}

      {/* Create PR button - only show on main branch when there's no open PR and not viewing a different branch */}
      {isMainBranch && !openPR && !isViewingPRBranch && (
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
    author: getStringValue(frontmatter?.author, "ETSA"), // Default to ETSA
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
    eventDate: getStringValue(
      frontmatter?.eventDate,
      getFirstTuesdayOfNextMonth(),
    ),
    eventLocation: getStringValue(frontmatter?.eventLocation),
    eventLocationName: getStringValue(
      frontmatter?.eventLocation?.name,
      DEFAULT_LOCATION.name,
    ),
    eventLocationAddress: getStringValue(
      frontmatter?.eventLocation?.address,
      DEFAULT_LOCATION.address,
    ),
    eventLocationLat: getStringValue(
      frontmatter?.eventLocation?.coordinates?.lat,
      DEFAULT_LOCATION.coordinates.lat,
    ),
    eventLocationLng: getStringValue(
      frontmatter?.eventLocation?.coordinates?.lng,
      DEFAULT_LOCATION.coordinates.lng,
    ),
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
  onPRCreated,
}: Readonly<BlogPostEditorProps>) {
  const [content, setContent] = useState(initialData?.content || "");
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [rawYaml, setRawYaml] = useState("");
  const [remainingDocuments, setRemainingDocuments] = useState(""); // Used in onSubmit for multi-document YAML
  const [showYamlEditor, setShowYamlEditor] = useState(!initialData); // Auto-expand for new posts
  const [showAssets, setShowAssets] = useState(false);
  const [existingAssets, setExistingAssets] = useState<
    Array<{
      name: string;
      path: string;
      url: string;
      type: string;
      size?: number;
    }>
  >([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [searchedPaths, setSearchedPaths] = useState<string[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: createDefaultValues(initialData),
  });

  const title = watch("title");
  const date = watch("date");

  // Update form and component state when initialData changes (e.g., branch switch)
  useEffect(() => {
    if (initialData) {
      // Reset form with new data
      reset(createDefaultValues(initialData));

      // Update component state
      setContent(initialData.content || "");
      setSlug(initialData.slug || "");

      // Update YAML content if available
      if (initialData.rawContent) {
        try {
          const { rawFirstDocument, remainingDocuments: remaining } =
            parseMultiDocumentYaml(initialData.rawContent);
          setRawYaml(rawFirstDocument);
          setRemainingDocuments(remaining);
        } catch (error) {
          console.error("Error parsing multi-document YAML:", error);
          if (initialData.frontmatter) {
            const yamlString = yaml.dump(initialData.frontmatter, {
              indent: 2,
              lineWidth: -1,
              noRefs: true,
            });
            setRawYaml(yamlString);
          }
        }
      }

      // Clear assets when switching branches (they'll be refetched if needed)
      setExistingAssets([]);
      setShowAssets(false);
    }
  }, [initialData, reset]);

  // Auto-generate slug from date and title for new posts
  useEffect(() => {
    if (!initialData?.slug) {
      if (title && date) {
        setSlug(generateSlugFromDateAndTitle(date, title));
      } else if (title) {
        setSlug(generateSlugFromTitle(title));
      }
    }
  }, [title, date, initialData?.slug]);

  // Update YAML template with live data from form for new posts
  useEffect(() => {
    if (!initialData && showYamlEditor) {
      const formData = {
        title: title || "",
        date: date || "",
        excerpt: watch("excerpt") || "",
        tags: watch("tags") || "",
        author: watch("author") || "",
        published: watch("published") ?? true,
        speakerName: watch("speakerName") || "",
        speakerTitle: watch("speakerTitle") || "",
        speakerCompany: watch("speakerCompany") || "",
        speakerBio: watch("speakerBio") || "",
        presentationTitle: watch("presentationTitle") || "",
        presentationDescription: watch("presentationDescription") || "",
        presentationSlides: watch("presentationSlides") || "",
        recordingUrl: watch("recordingUrl") || "",
        eventDate: watch("eventDate") || "",
        eventLocation: watch("eventLocation") || "",
        eventLocationName: watch("eventLocationName") || "",
        eventLocationAddress: watch("eventLocationAddress") || "",
        eventLocationLat: watch("eventLocationLat") || "",
        eventLocationLng: watch("eventLocationLng") || "",
        rawYaml: "",
      };

      const template = generateDefaultYamlTemplate(formData);
      setRawYaml(template);
    }
  }, [title, date, watch, initialData, showYamlEditor]);

  // Update preview when content changes
  useEffect(() => {
    processMarkdownPreview(content, setPreview);
  }, [content]);

  // Determine if we're on an update branch for THIS specific post
  const isUpdateBranchForThisPost = currentBranch.startsWith(
    `update-post-${slug}-`,
  );
  const isUpdateBranchForOtherPost =
    currentBranch.startsWith("update-post-") && !isUpdateBranchForThisPost;
  const isMainBranch = currentBranch === "main";

  // Function to fetch existing assets for the current slug
  const fetchExistingAssets = useCallback(async () => {
    // For new posts without a slug, we can't fetch assets yet
    if (!slug) {
      setExistingAssets([]);
      setSearchedPaths([]);
      return;
    }

    setLoadingAssets(true);
    try {
      const branch = viewingBranch || currentBranch;
      const response = await fetch(
        `/api/admin/posts/${encodeURIComponent(
          slug,
        )}/assets?branch=${encodeURIComponent(branch)}`,
      );

      if (response.ok) {
        const data = await response.json();
        setExistingAssets(data.assets || []);
        setSearchedPaths(data.searchedPath ? [data.searchedPath] : []);
      } else {
        console.error("Failed to fetch assets:", response.statusText);
        setExistingAssets([]);
        setSearchedPaths([]);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
      setExistingAssets([]);
      setSearchedPaths([]);
    } finally {
      setLoadingAssets(false);
    }
  }, [slug, viewingBranch, currentBranch]);

  // Fetch existing assets when slug changes or assets section is shown
  useEffect(() => {
    if (slug && showAssets) {
      fetchExistingAssets();
    }
  }, [slug, showAssets, fetchExistingAssets]);

  // Function to handle asset upload
  const handleAssetUpload = async (file: File) => {
    if (!slug) {
      alert(
        "Please enter a title and date to generate a slug before uploading assets.",
      );
      return;
    }

    setUploadingAsset(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);
      formData.append("branch", currentBranch);

      const response = await fetch("/api/admin/assets/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);

        // Show success message
        alert(
          `${result.message}${
            result.pullRequest ? ` (PR #${result.pullRequest.prNumber})` : ""
          }`,
        );

        // If a PR was created and we have a callback, notify the parent to switch branches
        if (result.pullRequest && onPRCreated) {
          console.log(
            "Asset upload created/updated PR, calling onPRCreated:",
            result.pullRequest,
          );
          onPRCreated({
            prNumber: result.pullRequest.prNumber,
            branchName: result.pullRequest.branchName,
            isNew: result.pullRequest.isNew,
          });
        } else {
          console.log("No PR created or no onPRCreated callback:", {
            hasPR: !!result.pullRequest,
            hasCallback: !!onPRCreated,
          });
        }

        // Refresh assets after successful upload - use a small delay to ensure branch state is updated
        setTimeout(async () => {
          await fetchExistingAssets();
        }, 500);
      } else {
        const error = await response.json();
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingAsset(false);
    }
  };

  // Function to insert asset into markdown
  const insertAssetIntoMarkdown = (assetName: string) => {
    const assetMarkdown = `![${assetName}](/presentation/${slug}/${assetName})`;

    // Get current content and append the asset markdown
    const currentContent = content;
    const newContent = currentContent + "\n\n" + assetMarkdown;

    // Update the content
    setContent(newContent);
  };

  // Function to handle asset deletion
  const handleAssetDelete = async (assetName: string) => {
    if (!slug) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
    );

    if (!confirmDelete) return;

    setDeletingAsset(assetName);
    try {
      const response = await fetch(
        `/api/admin/posts/${encodeURIComponent(
          slug,
        )}/assets?fileName=${encodeURIComponent(
          assetName,
        )}&branch=${encodeURIComponent(currentBranch)}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        const result = await response.json();
        alert(
          `${result.message}${
            result.pullRequest ? ` (PR #${result.pullRequest.prNumber})` : ""
          }`,
        );

        // Refresh assets after successful deletion
        await fetchExistingAssets();
      } else {
        const error = await response.json();
        console.error("Delete failed:", error);
        alert(`Delete failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingAsset(null);
    }
  };

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
                Slug (URL path)
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 shadow-sm cursor-not-allowed sm:text-sm"
              />
              {!initialData && (title || date) && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Preview:{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                    /blog/
                    {slug ||
                      (date && title
                        ? generateSlugFromDateAndTitle(date, title)
                        : title
                          ? generateSlugFromTitle(title)
                          : "your-post-slug")}
                  </code>
                </p>
              )}
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

        {/* Assets Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Presentation Assets
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add links to presentation slides, recordings, and other
                resources.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssets(!showAssets)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary"
            >
              {showAssets ? "Hide Assets" : "Show Assets"}
            </button>
          </div>

          {showAssets && (
            <div className="space-y-6">
              {/* Upload Assets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Upload New Asset
                  </h4>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    id="asset-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAssetUpload(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="asset-upload"
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-etsa-primary hover:bg-etsa-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary cursor-pointer ${
                      uploadingAsset ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {uploadingAsset ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        Upload File
                      </>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload files to public/presentation/{slug}/
                  </p>
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* Existing Assets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Existing Assets
                  </h4>
                  <button
                    type="button"
                    onClick={fetchExistingAssets}
                    disabled={loadingAssets}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    {loadingAssets ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {loadingAssets ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-etsa-primary"></div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      Loading assets...
                    </span>
                  </div>
                ) : existingAssets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {existingAssets.map((asset, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                {asset.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline truncate block"
                            >
                              {asset.name}
                            </a>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {asset.size && asset.size > 0
                                ? asset.size < 1024
                                  ? `${asset.size} bytes`
                                  : `${Math.round(asset.size / 1024)} KB`
                                : "Size unavailable"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              // Use just the filename - the blog system will auto-insert the slug path
                              setValue("presentationSlides", asset.name);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => insertAssetIntoMarkdown(asset.name)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAssetDelete(asset.name)}
                            disabled={deletingAsset === asset.name}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingAsset === asset.name ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700 dark:border-red-300 mr-1"></div>
                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {!slug
                        ? "Enter title and date to browse assets"
                        : "No assets found"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {!slug
                        ? "Fill in the title and date fields above to generate a slug, then you can browse and upload assets for this post."
                        : "No assets were found for this post slug. Upload assets to one of these locations:"}
                    </p>
                    {searchedPaths.length > 0 && (
                      <details className="mt-3 text-left">
                        <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                          Show searched locations ({searchedPaths.length})
                        </summary>
                        <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded p-2 text-xs text-gray-600 dark:text-gray-400">
                          <ul className="space-y-1">
                            {searchedPaths.slice(0, 6).map((path, index) => (
                              <li key={index} className="font-mono">
                                {path}/
                              </li>
                            ))}
                            {searchedPaths.length > 6 && (
                              <li className="text-gray-500 dark:text-gray-500">
                                ... and {searchedPaths.length - 6} more
                                locations
                              </li>
                            )}
                          </ul>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />
              {/* Presentation Slides */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="presentationSlides"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Presentation Slides URL (Use only the filename when stored
                    in Git under the slug)
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const title = watch("title");
                        const date = watch("date");
                        if (title && date) {
                          const slugURL = `presentation.pdf`;
                          setValue("presentationSlides", slugURL);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Local Git Storage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const title = watch("title");
                        const date = watch("date");
                        if (title && date) {
                          const googleSlidesUrl = `https://docs.google.com/presentation/d/YOUR_PRESENTATION_ID/edit#slide=id.p`;
                          setValue("presentationSlides", googleSlidesUrl);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Google Slides Template
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const title = watch("title");
                        const date = watch("date");
                        if (title && date) {
                          const slideshareUrl = `https://www.slideshare.net/YOUR_USERNAME/${title
                            .toLowerCase()
                            .replace(/\s+/g, "-")}-${date}`;
                          setValue("presentationSlides", slideshareUrl);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800"
                    >
                      SlideShare Template
                    </button>
                  </div>
                </div>
                <input
                  id="presentationSlides"
                  type="url"
                  {...register("presentationSlides")}
                  placeholder="https://docs.google.com/presentation/d/..."
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
                />
              </div>

              {/* Recording URL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="recordingUrl"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Recording URL
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const title = watch("title");
                        const date = watch("date");
                        if (title && date) {
                          const youtubeUrl = `https://www.youtube.com/watch?v=YOUR_VIDEO_ID`;
                          setValue("recordingUrl", youtubeUrl);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      YouTube Template
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const title = watch("title");
                        const date = watch("date");
                        if (title && date) {
                          const vimeoUrl = `https://vimeo.com/YOUR_VIDEO_ID`;
                          setValue("recordingUrl", vimeoUrl);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Vimeo Template
                    </button>
                  </div>
                </div>
                <input
                  id="recordingUrl"
                  type="url"
                  {...register("recordingUrl")}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Event Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Event Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="eventDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Event Date
              </label>
              <input
                id="eventDate"
                type="date"
                {...register("eventDate")}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Defaults to first Tuesday of next month
              </p>
            </div>

            <div>
              <label
                htmlFor="eventLocationName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Venue Name
              </label>
              <input
                id="eventLocationName"
                type="text"
                {...register("eventLocationName")}
                placeholder="Knoxville Entrepreneur Center"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="eventLocationAddress"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Address
              </label>
              <input
                id="eventLocationAddress"
                type="text"
                {...register("eventLocationAddress")}
                placeholder="2201 Kerns Rising Way, Knoxville, TN 37920"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Full address for the event location
              </p>
            </div>

            <div>
              <label
                htmlFor="eventLocationLat"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Latitude
              </label>
              <input
                id="eventLocationLat"
                type="text"
                {...register("eventLocationLat")}
                placeholder="35.953336"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="eventLocationLng"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Longitude
              </label>
              <input
                id="eventLocationLng"
                type="text"
                {...register("eventLocationLng")}
                placeholder="-83.914406"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Search for a location..."
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:ring-etsa-primary sm:text-sm"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const query = (e.target as HTMLInputElement).value;
                      if (!query.trim()) return;

                      try {
                        const result = await searchGoogleMaps(query);
                        if (result) {
                          setValue("eventLocationName", result.name);
                          setValue("eventLocationAddress", result.address);
                          setValue("eventLocationLat", result.lat);
                          setValue("eventLocationLng", result.lng);
                          (e.target as HTMLInputElement).value = "";
                        } else {
                          alert(
                            "No results found for that location. Please try a different search term.",
                          );
                        }
                      } catch (error) {
                        console.error("Search error:", error);
                        alert(
                          "Error searching for location. Please try again.",
                        );
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    const input = document.querySelector(
                      'input[placeholder="Search for a location..."]',
                    ) as HTMLInputElement;
                    const query = input?.value;
                    if (!query?.trim()) {
                      alert("Please enter a location to search for.");
                      return;
                    }

                    try {
                      const result = await searchGoogleMaps(query);
                      if (result) {
                        setValue("eventLocationName", result.name);
                        setValue("eventLocationAddress", result.address);
                        setValue("eventLocationLat", result.lat);
                        setValue("eventLocationLng", result.lng);
                        input.value = "";
                      } else {
                        alert(
                          "No results found for that location. Please try a different search term.",
                        );
                      }
                    } catch (error) {
                      console.error("Search error:", error);
                      alert("Error searching for location. Please try again.");
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-etsa-primary"
                >
                  📍 Search
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Search for a location to automatically fill address and
                coordinates. Press Enter or click Search.
              </p>
            </div>
          </div>
        </div>

        {/* Advanced YAML Editor */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Advanced YAML Editor
                {!initialData && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Required for new posts
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {!initialData
                  ? "Configure your post metadata below. The template updates automatically as you fill in the Basic Information above."
                  : "Edit the raw YAML frontmatter. Changes here will override form fields above."}
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
              {!initialData ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Live Template
                      </h3>
                      <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        <p>
                          This template updates automatically as you fill in the
                          Basic Information above. You can customize any field
                          directly in the YAML below. This metadata controls how
                          your post appears on the website.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}

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
