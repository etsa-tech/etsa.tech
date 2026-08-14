"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AttendanceRecord, AttendanceRecordInput } from "@/types/attendance";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { AttendanceStats } from "@/components/AttendanceStats";
import AttendanceTable from "@/components/admin/AttendanceTable";
import AttendanceForm from "@/components/admin/AttendanceForm";
import AttendanceBulkImport from "@/components/admin/AttendanceBulkImport";
import Modal from "@/components/admin/Modal";
import { PickablePost } from "@/components/admin/AttendancePostPicker";

// The form modal's target: closed, adding a new record, or editing an
// existing one.
type FormTarget = "closed" | "add" | AttendanceRecord;

async function parseJsonError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [posts, setPosts] = useState<PickablePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>("closed");
  const [canDelete, setCanDelete] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/attendance");
      if (!response.ok) throw new Error(await parseJsonError(response));
      const data = await response.json();
      setRecords(data.records || []);
      setCanDelete(Boolean(data.canDelete));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    fetch("/api/admin/attendance/posts")
      .then((response) => (response.ok ? response.json() : { posts: [] }))
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]));
  }, [loadRecords]);

  const createRecord = async (input: AttendanceRecordInput) => {
    const response = await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(await parseJsonError(response));
    await loadRecords();
  };

  const updateRecord = async (id: string, input: AttendanceRecordInput) => {
    const response = await fetch(`/api/admin/attendance/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(await parseJsonError(response));
    await loadRecords();
  };

  const importRow = async (
    input: AttendanceRecordInput,
    existingId?: string,
  ) => {
    if (existingId) {
      await updateRecord(existingId, input);
    } else {
      await createRecord(input);
    }
  };

  const deleteRecord = async (record: AttendanceRecord) => {
    if (!confirm(`Delete attendance record for ${record.eventDate}?`)) return;
    const response = await fetch(`/api/admin/attendance/${record.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError(await parseJsonError(response));
      return;
    }
    await loadRecords();
  };

  const stats = computeAttendanceStats(records);
  const isEditing = formTarget !== "closed" && formTarget !== "add";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Attendance
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Track in-person vs. virtual headcount per event and see yearly
          averages.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <AttendanceStats stats={stats} records={records} />

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="card-title text-lg">Records</h3>
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/attendance/speakers"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              By speaker →
            </Link>
            <button
              type="button"
              className="rounded-md bg-etsa-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-etsa-primary-dark"
              onClick={() => setFormTarget("add")}
            >
              Add record
            </button>
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setShowBulkImport(!showBulkImport)}
            >
              {showBulkImport ? "Cancel" : "Bulk import"}
            </button>
          </div>
        </div>
        <div className="card-content space-y-6">
          {showBulkImport && (
            <AttendanceBulkImport
              existingRecords={records}
              onImportRow={importRow}
              onComplete={loadRecords}
            />
          )}

          <AttendanceTable
            records={records}
            isLoading={isLoading}
            onEdit={(record) => setFormTarget(record)}
            onDelete={deleteRecord}
            canDelete={canDelete}
          />
        </div>
      </div>

      {formTarget !== "closed" && (
        <Modal
          title={isEditing ? "Edit attendance record" : "Add attendance record"}
          onClose={() => setFormTarget("closed")}
        >
          <AttendanceForm
            posts={posts}
            initial={isEditing ? (formTarget as AttendanceRecord) : undefined}
            submitLabel={isEditing ? "Save changes" : "Add record"}
            onSubmit={async (input) => {
              if (isEditing) {
                await updateRecord((formTarget as AttendanceRecord).id, input);
              } else {
                await createRecord(input);
              }
              setFormTarget("closed");
            }}
            onCancel={() => setFormTarget("closed")}
          />
        </Modal>
      )}
    </div>
  );
}
