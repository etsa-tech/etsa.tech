"use client";

import { useState, useMemo } from "react";
import { PostSummary } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";

interface BlogSearchComponentProps {
  posts: PostSummary[];
  className?: string;
}

export default function BlogSearchComponent({
  posts,
  className = "",
}: Readonly<BlogSearchComponentProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }

    // Client-side search function
    const searchTerm = searchQuery.toLowerCase();
    return posts.filter((post) => {
      const { title, excerpt, tags } = post.frontmatter;

      return (
        title.toLowerCase().includes(searchTerm) ||
        excerpt.toLowerCase().includes(searchTerm) ||
        tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    });
  }, [posts, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearching(value.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search blog posts..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {isSearching && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Info */}
      {isSearching && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {searchResults.length === 0 ? (
            <span>No blog posts found for &quot;{searchQuery}&quot;</span>
          ) : (
            <span>
              Found {searchResults.length} blog post
              {searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}
              &quot;
            </span>
          )}
        </div>
      )}

      {/* Results Grid */}
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {searchResults.map((post) => (
            <PostCard key={post.slug} post={post} showSpeakers={false} />
          ))}
        </div>
      ) : isSearching ? (
        <EmptyState
          icon="🔍"
          title="No blog posts found"
          description={`We couldn't find any blog posts matching "${searchQuery}".`}
          action={
            <button onClick={clearSearch} className="btn btn-primary">
              Clear Search
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} showSpeakers={false} />
          ))}
        </div>
      )}
    </div>
  );
}
