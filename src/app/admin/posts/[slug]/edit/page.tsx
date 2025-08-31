"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import BlogPostEditor from "@/components/admin/BlogPostEditor";
import { useAdmin } from "@/contexts/AdminContext";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { selectedBranch, setSelectedBranch, availableBranches } = useAdmin();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [postData, setPostData] = useState<{
    slug: string;
    frontmatter: Record<string, unknown>;
    content: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [openPR, setOpenPR] = useState<{
    branchName: string;
    prNumber: number;
  } | null>(null);
  const [viewBranch, setViewBranch] = useState<string>(""); // One-time branch selector
  const [prCheckComplete, setPrCheckComplete] = useState(false);

  // Check for open PR for this post
  useEffect(() => {
    const checkOpenPR = async () => {
      try {
        const response = await fetch(`/api/admin/posts/${slug}/pr`);
        if (response.ok) {
          const data = await response.json();
          if (data.openPR) {
            console.log(
              `Found open PR #${data.openPR.prNumber} for post ${slug}, using branch: ${data.openPR.branchName}`,
            );
            setOpenPR(data.openPR);
            // Set the default view branch to the PR branch
            setViewBranch(data.openPR.branchName);
          } else {
            console.log(
              `No open PR found for post ${slug}, using branch: ${selectedBranch}`,
            );
            // No open PR, use selectedBranch
            setViewBranch(selectedBranch);
          }
        } else {
          console.log(
            `Error checking PR for post ${slug}, using branch: ${selectedBranch}`,
          );
          // Error or no PR, use selectedBranch
          setViewBranch(selectedBranch);
        }
      } catch (error) {
        console.error("Error checking for open PR:", error);
        setViewBranch(selectedBranch);
      } finally {
        setPrCheckComplete(true);
      }
    };

    if (slug && selectedBranch) {
      checkOpenPR();
    }
  }, [slug, selectedBranch]);

  // Check for existing update branch for this post and switch to it
  useEffect(() => {
    if (availableBranches.length > 0) {
      const updateBranchPattern = `update-post-${slug}-`;
      const existingUpdateBranch = availableBranches.find((branch) =>
        branch.startsWith(updateBranchPattern),
      );

      // Only auto-switch if:
      // 1. There's an existing update branch for THIS specific post
      // 2. We're currently on main branch (not on another post's branch)
      // 3. We're not already on the correct branch
      if (existingUpdateBranch && selectedBranch === "main") {
        console.log(
          `Switching from main to existing update branch: ${existingUpdateBranch}`,
        );
        setSelectedBranch(existingUpdateBranch);
      }
      // If we're on a different post's update branch, switch back to main
      else if (
        selectedBranch.startsWith("update-post-") &&
        !selectedBranch.startsWith(updateBranchPattern)
      ) {
        console.log(
          `Switching from different post's branch (${selectedBranch}) to main for post: ${slug}`,
        );
        setSelectedBranch("main");
      }
    }
  }, [availableBranches, slug, selectedBranch, setSelectedBranch]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // Use viewBranch (which is set after PR check completes)
        const branchToUse = viewBranch;

        console.log(`Fetching post ${slug} from branch: ${branchToUse}`);

        // Set loading state when refetching due to branch change
        setIsLoadingPost(true);

        // Use slug directly - Next.js handles URL encoding/decoding
        const response = await fetch(
          `/api/admin/posts/${slug}?branch=${encodeURIComponent(branchToUse)}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }
        const data = await response.json();
        setPostData(data);

        // Clear any previous error messages when successfully loading new branch data
        setMessage(null);
      } catch (error) {
        console.error("Error fetching post:", error);
        setMessage({
          type: "error",
          text: "Failed to load post",
        });
      } finally {
        setIsLoadingPost(false);
      }
    };

    // Only fetch after PR check is complete and we have a branch to use
    if (slug && viewBranch && prCheckComplete) {
      fetchPost();
    }
  }, [slug, viewBranch, prCheckComplete]);

  const handleSave = async (data: {
    slug: string;
    frontmatter: Record<string, unknown>;
    content: string;
    createPR: boolean;
  }) => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Determine which branch to save to:
      let saveToBranch: string;

      if (data.createPR && openPR) {
        // If user clicks "Save to PR" and there's an open PR, always save to the PR branch
        saveToBranch = openPR.branchName;
      } else if (viewBranch !== selectedBranch) {
        // If viewing a different branch (like a PR branch), save to that branch
        saveToBranch = viewBranch;
      } else {
        // Otherwise, save to the selected branch
        saveToBranch = selectedBranch;
      }

      // Use slug directly - Next.js handles URL encoding/decoding
      const response = await fetch(
        `/api/admin/posts/${slug}?branch=${encodeURIComponent(saveToBranch)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update post");
      }

      let successMessage: string;
      if (data.createPR) {
        if (result.isNewPR === false) {
          successMessage = `Changes saved to existing pull request #${result.prNumber}!`;
        } else {
          successMessage = `Pull request #${result.prNumber} created successfully!`;
        }
      } else {
        successMessage = "Post updated successfully!";
      }

      setMessage({
        type: "success",
        text: successMessage,
      });

      if (data.createPR) {
        // After creating PR, refresh the page to show the update branch UI
        setTimeout(() => {
          setMessage({
            type: "success",
            text: "Refreshing to show update branch interface...",
          });
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }, 1500);
      } else {
        // For direct saves, redirect to posts list
        setTimeout(() => {
          router.push("/admin/posts");
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating post:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update post",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPost) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Post not found
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The requested blog post could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Blog Post: {String(postData.frontmatter.title || "Untitled")}
        </h1>
      </div>

      {/* Branch Selector for viewing different versions */}
      {openPR && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  This post has an open pull request #{openPR.prNumber}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Viewing content from:{" "}
                  <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
                    {viewBranch}
                  </code>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="branch-select"
                className="text-sm font-medium text-blue-800 dark:text-blue-200"
              >
                View from:
              </label>
              <select
                id="branch-select"
                value={viewBranch}
                onChange={(e) => setViewBranch(e.target.value)}
                className="text-sm border border-blue-300 dark:border-blue-600 rounded-md px-2 py-1 bg-white dark:bg-blue-900 text-blue-900 dark:text-blue-100"
              >
                <option value={openPR.branchName}>
                  PR Branch ({openPR.branchName})
                </option>
                <option value="main">Main Branch</option>
              </select>
            </div>
          </div>
        </div>
      )}

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
        initialData={postData}
        onSave={handleSave}
        isLoading={isLoading}
        currentBranch={selectedBranch}
        viewingBranch={viewBranch}
        openPR={openPR}
      />
    </div>
  );
}
