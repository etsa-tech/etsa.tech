"use client";

import { useMemo, useState } from "react";

export interface PickablePost {
  slug: string;
  title: string;
  date: string;
}

interface AttendancePostPickerProps {
  readonly id?: string;
  readonly posts: PickablePost[];
  readonly value: string; // selected slug
  readonly onSelect: (post: PickablePost) => void;
}

export default function AttendancePostPicker({
  id,
  posts,
  value,
  onSelect,
}: AttendancePostPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedPost = posts.find((post) => post.slug === value);

  const filteredPosts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return posts.slice(0, 20);
    return posts
      .filter((post) => post.title.toLowerCase().includes(term))
      .slice(0, 20);
  }, [posts, query]);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
        placeholder="Search posts by title..."
        value={isOpen ? query : selectedPost?.title ?? ""}
        onFocus={() => {
          setQuery("");
          setIsOpen(true);
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onChange={(event) => setQuery(event.target.value)}
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 shadow-lg ring-1 ring-black/5">
          {filteredPosts.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No matching posts
            </li>
          )}
          {filteredPosts.map((post) => (
            <li key={post.slug}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(post);
                  setIsOpen(false);
                }}
              >
                {post.title}{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  ({post.date})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
