"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import BlogPostEditor from "@/components/admin/BlogPostEditor";
import { useAdmin } from "@/contexts/AdminContext";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { selectedBranch } = useAdmin();

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

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // Use slug directly - Next.js handles URL encoding/decoding
        const response = await fetch(
          `/api/admin/posts/${slug}?branch=${encodeURIComponent(
            selectedBranch,
          )}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }
        const data = await response.json();
        setPostData(data);
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

    if (slug) {
      fetchPost();
    }
  }, [slug, selectedBranch]);

  const handleSave = async (data: {
    slug: string;
    frontmatter: Record<string, unknown>;
    content: string;
    createPR: boolean;
  }) => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Use slug directly - Next.js handles URL encoding/decoding
      const response = await fetch(
        `/api/admin/posts/${slug}?branch=${encodeURIComponent(selectedBranch)}`,
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

      setMessage({
        type: "success",
        text: data.createPR
          ? `Pull request #${result.prNumber} created successfully!`
          : "Post updated successfully!",
      });

      if (!data.createPR) {
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
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Make changes to your blog post.
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
        initialData={postData}
        onSave={handleSave}
        isLoading={isLoading}
      />
    </div>
  );
}
