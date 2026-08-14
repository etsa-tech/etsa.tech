"use client";

import { useState } from "react";
import { AttendanceFormat, AttendanceRecordInput } from "@/types/attendance";
import AttendancePostPicker, { PickablePost } from "./AttendancePostPicker";

interface AttendanceFormProps {
  // Omit when lockedPost is set - the picker is hidden and this isn't needed.
  readonly posts?: PickablePost[];
  // When set, the post is fixed (e.g. the per-post attendance view reached
  // from a blog post's admin actions) and the picker is replaced with a
  // static label instead of letting the user change it.
  readonly lockedPost?: PickablePost;
  readonly initial?: AttendanceRecordInput;
  readonly submitLabel: string;
  readonly onSubmit: (input: AttendanceRecordInput) => Promise<void>;
  readonly onCancel?: () => void;
}

const emptyInput: AttendanceRecordInput = {
  eventDate: "",
  postSlug: "",
  eventTitle: "",
  format: "hybrid",
  inPersonCount: 0,
  virtualCount: 0,
  notes: "",
};

export default function AttendanceForm({
  posts = [],
  lockedPost,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: AttendanceFormProps) {
  const [input, setInput] = useState<AttendanceRecordInput>(
    initial ??
      (lockedPost
        ? {
            ...emptyInput,
            eventDate: lockedPost.date,
            postSlug: lockedPost.slug,
            eventTitle: lockedPost.title,
          }
        : emptyInput),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.postSlug) {
      setError("Please select a linked post.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div>
        <label
          htmlFor="eventDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Event date
        </label>
        <input
          id="eventDate"
          type="date"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
          value={input.eventDate}
          onChange={(event) =>
            setInput({ ...input, eventDate: event.target.value })
          }
        />
      </div>

      <div>
        {lockedPost ? (
          <>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Linked post
            </span>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {lockedPost.title}
            </p>
          </>
        ) : (
          <>
            <label
              htmlFor="postSlug"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Linked post
            </label>
            <AttendancePostPicker
              id="postSlug"
              posts={posts}
              value={input.postSlug}
              onSelect={(post) =>
                setInput({
                  ...input,
                  eventDate: post.date,
                  postSlug: post.slug,
                  eventTitle: post.title,
                })
              }
            />
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="format"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Format
        </label>
        <select
          id="format"
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
          value={input.format}
          onChange={(event) =>
            setInput({
              ...input,
              format: event.target.value as AttendanceFormat,
            })
          }
        >
          <option value="hybrid">Hybrid</option>
          <option value="in-person">In-person</option>
          <option value="virtual">Virtual</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="inPersonCount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            In-person count
          </label>
          <input
            id="inPersonCount"
            type="number"
            min={0}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
            value={input.inPersonCount}
            onChange={(event) =>
              setInput({
                ...input,
                inPersonCount: Number(event.target.value),
              })
            }
          />
        </div>
        <div>
          <label
            htmlFor="virtualCount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Virtual count
          </label>
          <input
            id="virtualCount"
            type="number"
            min={0}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
            value={input.virtualCount}
            onChange={(event) =>
              setInput({ ...input, virtualCount: Number(event.target.value) })
            }
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
          rows={2}
          value={input.notes ?? ""}
          onChange={(event) =>
            setInput({ ...input, notes: event.target.value })
          }
        />
      </div>

      <div className="flex items-center space-x-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
