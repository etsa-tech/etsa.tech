"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/contexts/AdminContext";

interface BranchSelectorProps {
  readonly className?: string;
}

export default function BranchSelector({
  className = "",
}: Readonly<BranchSelectorProps>) {
  const {
    selectedBranch,
    setSelectedBranch,
    availableBranches,
    setAvailableBranches,
  } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch("/api/admin/branches");
        if (!response.ok) {
          throw new Error("Failed to fetch branches");
        }
        const data = await response.json();
        setAvailableBranches(data.branches || []);
      } catch (err) {
        console.error("Error fetching branches:", err);
        setError("Failed to load branches");
        setAvailableBranches(["main"]); // Fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, [setAvailableBranches]);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Branch:
        </span>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label
        htmlFor="branch-select"
        className="text-sm text-gray-600 dark:text-gray-400"
      >
        Branch:
      </label>
      <div className="relative">
        <select
          id="branch-select"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary"
        >
          {availableBranches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {error && (
        <span className="text-xs text-red-600 dark:text-red-400" title={error}>
          ⚠️
        </span>
      )}

      {selectedBranch !== "main" && (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            selectedBranch.startsWith("update-post-")
              ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
              : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
          }`}
        >
          {selectedBranch.startsWith("update-post-") ? "📝 " : ""}
          {selectedBranch}
        </span>
      )}
    </div>
  );
}
