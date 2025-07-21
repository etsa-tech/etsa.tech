"use client";

import { useState, useMemo } from "react";
import { PostSummary } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { getPostSpeakers } from "@/lib/utils";

interface SearchComponentProps {
  posts: PostSummary[];
  className?: string;
}

export default function SearchComponent({
  posts,
  className = "",
}: Readonly<SearchComponentProps>) {
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
      const speakers = getPostSpeakers(post.frontmatter);

      // Check if search term matches title, excerpt, or tags
      const matchesContent =
        title.toLowerCase().includes(searchTerm) ||
        excerpt.toLowerCase().includes(searchTerm) ||
        tags.some((tag) => tag.toLowerCase().includes(searchTerm));

      // Check if search term matches any speaker name, title, or company
      const matchesSpeakers = speakers.some(
        (speaker) =>
          speaker.name.toLowerCase().includes(searchTerm) ||
          (speaker.title && speaker.title.toLowerCase().includes(searchTerm)) ||
          (speaker.company &&
            speaker.company.toLowerCase().includes(searchTerm)),
      );

      return matchesContent || matchesSpeakers;
    });
  }, [searchQuery, posts]);

  // Handle search input with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      setIsSearching(true);
      // Simulate search delay for better UX
      setTimeout(() => setIsSearching(false), 300);
    } else {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const renderSearchContent = () => {
    if (searchResults.length > 0) {
      return (
        <>
          {/* Results Header */}
          {searchQuery && (
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Search Results
              </h2>
              <button
                onClick={clearSearch}
                className="text-sm text-etsa-primary hover:text-etsa-secondary transition-colors"
              >
                Show all presentations
              </button>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchResults.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </>
      );
    }

    if (searchQuery) {
      return (
        /* No Results */
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No presentations found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We couldn&apos;t find any presentations matching &quot;
            {searchQuery}&quot;. Try different keywords or browse all
            presentations.
          </p>
          <div className="space-x-4">
            <button
              onClick={clearSearch}
              className="bg-etsa-primary hover:bg-etsa-secondary text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Show All Presentations
            </button>
          </div>
        </div>
      );
    }

    return (
      /* Default View - All Posts */
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Search Input */}
      <div className="card mb-8">
        <div className="card-header">
          <h3 className="card-title text-lg">Search Presentations</h3>
        </div>
        <div className="card-content">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by title, speaker, or topic..."
              className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors"
            />

            {/* Search Icon */}
            <svg
              className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
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

            {/* Clear Button */}
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-3.5 h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Loading Indicator */}
            {isSearching && (
              <div className="absolute right-12 top-3.5">
                <div className="animate-spin h-5 w-5 border-2 border-etsa-primary border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Search Stats */}
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {searchResults.length === 0 ? (
                <span>
                  No presentations found for &quot;{searchQuery}&quot;
                </span>
              ) : (
                <span>
                  Found {searchResults.length} presentation
                  {searchResults.length !== 1 ? "s" : ""}
                  {searchQuery && ` for "${searchQuery}"`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-6">{renderSearchContent()}</div>
    </div>
  );
}

// Search suggestions component
interface SearchSuggestionsProps {
  query: string;
  posts: PostSummary[];
  onSuggestionClick: (suggestion: string) => void;
}

export function SearchSuggestions({
  query,
  posts,
  onSuggestionClick,
}: Readonly<SearchSuggestionsProps>) {
  // Get unique tags and speakers that match the query
  const suggestions = useMemo(() => {
    if (!query.trim()) {
      return { tags: [], speakers: [] };
    }
    const allTags = new Set<string>();
    const allSpeakers = new Set<string>();

    posts.forEach((post) => {
      post.frontmatter.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          allTags.add(tag);
        }
      });

      if (
        post.frontmatter.speakerName
          ?.toLowerCase()
          .includes(query.toLowerCase())
      ) {
        allSpeakers.add(post.frontmatter.speakerName);
      }
    });

    return {
      tags: Array.from(allTags).slice(0, 5),
      speakers: Array.from(allSpeakers).slice(0, 3),
    };
  }, [query, posts]);

  if (
    !query.trim() ||
    (suggestions.tags.length === 0 && suggestions.speakers.length === 0)
  ) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
      <div className="p-4 space-y-3">
        {suggestions.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSuggestionClick(tag)}
                  className="text-xs px-2 py-1 bg-etsa-primary/10 text-etsa-primary rounded hover:bg-etsa-primary/20 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestions.speakers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Speakers
            </h4>
            <div className="space-y-1">
              {suggestions.speakers.map((speaker) => (
                <button
                  key={speaker}
                  onClick={() => onSuggestionClick(speaker)}
                  className="block text-sm text-gray-600 dark:text-gray-400 hover:text-etsa-primary transition-colors"
                >
                  {speaker}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
