"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BlogPostsTable from "@/components/admin/BlogPostsTable";
import BranchSelector from "@/components/admin/BranchSelector";
import { useAdmin } from "@/contexts/AdminContext";

// BlogPost interface that matches BlogPostsTable expectations
interface BlogPost {
  name: string;
  path: string;
  size: number;
  frontmatter?: {
    title: string;
    date: string;
    speakerName?: string;
    speakerImage?: string;
    speakers?: Array<{
      name: string;
      image?: string;
    }>;
  };
}

export default function BlogPostsPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedBranch } = useAdmin();

  useEffect(() => {
    const fetchBlogPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/posts?branch=${encodeURIComponent(selectedBranch)}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        const data = await response.json();
        setBlogPosts(data.posts || []);
      } catch (err) {
        setError(
          "Failed to load blog posts. Please check GitHub configuration.",
        );
        console.error("Error loading blog posts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogPosts();
  }, [selectedBranch]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Blog Posts
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage your ETSA blog posts and presentations.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex sm:items-center sm:space-x-4">
          <BranchSelector />
          <Link
            href="/admin/posts/new"
            className="block rounded-md bg-etsa-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-etsa-primary"
          >
            Create New Post
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error Loading Posts
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <BlogPostsTable posts={blogPosts} isLoading={isLoading} />
      )}
    </div>
  );
}
