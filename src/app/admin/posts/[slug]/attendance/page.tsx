"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AttendanceRecord, AttendanceRecordInput } from "@/types/attendance";
import AttendanceForm from "@/components/admin/AttendanceForm";
import { YearAttendanceBreakdown } from "@/components/YearAttendanceBreakdown";

interface AttendanceLookup {
  postSlug: string;
  postTitle: string;
  postDate: string;
  record: AttendanceRecord | null;
}

async function parseJsonError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return "Request failed";
  }
}

const formatLabels: Record<AttendanceRecord["format"], string> = {
  "in-person": "In-person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

export default function PostAttendancePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<AttendanceLookup | null>(null);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lookupResponse, allResponse] = await Promise.all([
        fetch(`/api/admin/posts/${slug}/attendance`),
        fetch("/api/admin/attendance"),
      ]);
      if (!lookupResponse.ok)
        throw new Error(await parseJsonError(lookupResponse));
      setData(await lookupResponse.json());
      // Powers the yearly breakdown chart below - best-effort, since the
      // page is still useful (just without the chart) if this one fails.
      if (allResponse.ok) {
        const allData = await allResponse.json();
        setAllRecords(allData.records || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load attendance",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSubmit = async (input: AttendanceRecordInput) => {
    const existingId = data?.record?.id;
    const response = await fetch(
      existingId
        ? `/api/admin/attendance/${existingId}`
        : "/api/admin/attendance",
      {
        method: existingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error(await parseJsonError(response));
    setIsEditing(false);
    await load();
  };

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading attendance...
      </p>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || "Failed to load attendance"}
        </p>
        <Link href="/admin/posts" className="text-etsa-primary hover:underline">
          Back to posts
        </Link>
      </div>
    );
  }

  const { postTitle, record } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/posts"
          className="text-sm text-etsa-primary hover:underline"
        >
          ← Back to posts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Attendance
        </h1>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {postTitle}
        </p>
      </div>

      <div className="card">
        <div className="card-content space-y-4">
          {isEditing ? (
            <AttendanceForm
              lockedPost={{ slug, title: postTitle, date: data.postDate }}
              initial={
                record
                  ? {
                      eventDate: record.eventDate,
                      postSlug: record.postSlug,
                      eventTitle: record.eventTitle,
                      format: record.format,
                      inPersonCount: record.inPersonCount,
                      virtualCount: record.virtualCount,
                      notes: record.notes,
                    }
                  : undefined
              }
              submitLabel={record ? "Save changes" : "Add record"}
              onSubmit={handleSubmit}
              onCancel={() => setIsEditing(false)}
            />
          ) : record ? (
            <>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Format" value={formatLabels[record.format]} />
                <Stat label="In-person" value={record.inPersonCount} />
                <Stat label="Virtual" value={record.virtualCount} />
                <Stat
                  label="Total"
                  value={record.inPersonCount + record.virtualCount}
                />
              </dl>
              {record.notes && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {record.notes}
                </p>
              )}
              <button
                type="button"
                className="rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>

              {allRecords.length > 0 && (
                <div className="pt-2">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {record.eventDate.slice(0, 4)} attendance by event
                  </h3>
                  <YearAttendanceBreakdown
                    year={Number(record.eventDate.slice(0, 4))}
                    records={allRecords}
                    highlightId={record.id}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No attendance recorded for this event yet.
              </p>
              <button
                type="button"
                className="rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark"
                onClick={() => setIsEditing(true)}
              >
                Add attendance record
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}
