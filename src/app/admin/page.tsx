"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AdminBlogPost {
  slug: string;
  title: string;
  date: string;
  status: string;
  author?: string;
  frontmatter?: {
    published?: boolean;
    [key: string]: unknown;
  };
}

export default function AdminDashboard() {
  const [blogPosts, setBlogPosts] = useState<AdminBlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch("/api/admin/posts");
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
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-5"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Posts
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                    {error ? "—" : blogPosts.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/admin/posts"
                className="font-medium text-etsa-primary hover:text-etsa-primary-dark"
              >
                Manage posts
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                    Published
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                    {error
                      ? "—"
                      : blogPosts.filter(
                          (post) => post.frontmatter?.published !== false,
                        ).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Live on website
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📄</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                    Drafts
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                    {error
                      ? "—"
                      : blogPosts.filter(
                          (post) => post.frontmatter?.published === false,
                        ).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Not published
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🖼️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                    Asset Management
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    Coming later
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/admin/assets"
                className="font-medium text-etsa-primary hover:text-etsa-primary-dark"
              >
                Manage assets
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚙️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                    Settings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    Configure
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/admin/settings"
                className="font-medium text-etsa-primary hover:text-etsa-primary-dark"
              >
                View settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Configuration Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
                <p className="mt-2">
                  Please ensure the following environment variables are set:
                </p>
                <ul className="mt-1 list-disc list-inside">
                  <li>GITHUB_APP_ID</li>
                  <li>GITHUB_APP_PRIVATE_KEY</li>
                  <li>GITHUB_APP_INSTALLATION_ID</li>
                  <li>GITHUB_OWNER</li>
                  <li>GITHUB_REPO</li>
                  <li>GOOGLE_CLIENT_ID</li>
                  <li>GOOGLE_CLIENT_SECRET</li>
                  <li>NEXTAUTH_SECRET</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Quick Actions
          </h3>
          <div className="mt-5">
            <div className="flex space-x-3">
              <Link
                href="/admin/posts/new"
                className="inline-flex items-center rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-etsa-primary"
              >
                Create New Post
              </Link>
              <Link
                href="/admin/assets"
                className="inline-flex items-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Upload Assets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
