"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

export default function NewPostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [currentBranch] = useState("main");
  const [viewingBranch, setViewingBranch] = useState<string | undefined>(
    undefined,
  );
  const [openPR, setOpenPR] = useState<{
    branchName: string;
    prNumber: number;
  } | null>(null);

  const handleSave = async (data: {
    slug: string;
    frontmatter: Record<string, unknown>;
    content: string;
    createPR: boolean;
  }) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/posts/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create post");
      }

      console.log("Post creation result:", result);
      console.log("Slug from form data:", data.slug);
      console.log("Slug from API response:", result.slug);

      setMessage({
        type: "success",
        text: data.createPR
          ? `Pull request #${result.prNumber} created successfully!`
          : "Post created successfully!",
      });

      if (data.createPR) {
        // For PR creation, redirect to edit page with branch parameter
        setTimeout(() => {
          setMessage({
            type: "success",
            text: "Redirecting to edit page...",
          });
          setTimeout(() => {
            // Use the slug from the API response to ensure consistency
            const editUrl = `/admin/posts/${result.slug}/edit`;
            console.log("Redirecting to:", editUrl);
            router.push(editUrl);
          }, 500);
        }, 1500);
      } else {
        // For direct creation, redirect to posts list
        setTimeout(() => {
          router.push("/admin/posts");
        }, 2000);
      }
    } catch (error) {
      console.error("Error creating post:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create post",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePRCreated = (prInfo: {
    prNumber: number;
    branchName: string;
    isNew: boolean;
  }) => {
    console.log("New post page: PR created from asset upload", prInfo);

    // Update the open PR state
    setOpenPR({
      branchName: prInfo.branchName,
      prNumber: prInfo.prNumber,
    });

    // Switch to viewing the PR branch
    setViewingBranch(prInfo.branchName);

    // Show success message for asset upload
    setMessage({
      type: "success",
      text: `Asset uploaded successfully! ${
        prInfo.isNew ? "Created" : "Updated"
      } PR #${prInfo.prNumber}. Switched to PR branch.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Blog Post
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create a new blog post for the ETSA website.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-red-50 dark:bg-red-900/20"
          }`}
        >
          <div className="flex">
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  message.type === "success"
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <BlogPostEditor
        onSave={handleSave}
        isLoading={isLoading}
        currentBranch={currentBranch}
        viewingBranch={viewingBranch}
        openPR={openPR}
        onPRCreated={handlePRCreated}
      />
    </div>
  );
}
