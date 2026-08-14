"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AttendanceFormat, AttendanceRecord } from "@/types/attendance";
import { SortIcon, SortDirection } from "./SortIcon";

interface AttendanceTableProps {
  readonly records: AttendanceRecord[];
  readonly isLoading: boolean;
  readonly onEdit: (record: AttendanceRecord) => void;
  readonly onDelete: (record: AttendanceRecord) => void;
  // Deleting is only allowed when ATTENDANCE_SHEETS_WEBHOOK_URL isn't
  // configured (local dev - see attendance-sheets-sync.ts). The server
  // enforces this regardless, but there's no reason to show a button that
  // always 403s on the deployed site.
  readonly canDelete: boolean;
}

type SortField = "date" | "event" | "format" | "inPerson" | "virtual" | "total";

const formatLabels: Record<AttendanceFormat, string> = {
  "in-person": "In-person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

const sortValue: Record<
  SortField,
  (record: AttendanceRecord) => string | number
> = {
  date: (record) => record.eventDate,
  event: (record) => record.eventTitle.toLowerCase(),
  format: (record) => record.format,
  inPerson: (record) => record.inPersonCount,
  virtual: (record) => record.virtualCount,
  total: (record) => record.inPersonCount + record.virtualCount,
};

export default function AttendanceTable({
  records,
  isLoading,
  onEdit,
  onDelete,
  canDelete,
}: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState<AttendanceFormat | "all">(
    "all",
  );
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const visibleRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = records.filter((record) => {
      const matchesSearch =
        !term ||
        record.eventTitle.toLowerCase().includes(term) ||
        record.postSlug.toLowerCase().includes(term) ||
        (record.notes ?? "").toLowerCase().includes(term);
      const matchesFormat =
        formatFilter === "all" || record.format === formatFilter;
      return matchesSearch && matchesFormat;
    });

    const getValue = sortValue[sortField];
    return [...filtered].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, searchTerm, formatFilter, sortField, sortDirection]);

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading attendance records...
      </p>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No attendance records yet.
      </p>
    );
  }

  const columns: { field: SortField; label: string }[] = [
    { field: "date", label: "Date" },
    { field: "event", label: "Event" },
    { field: "format", label: "Format" },
    { field: "inPerson", label: "In-person" },
    { field: "virtual", label: "Virtual" },
    { field: "total", label: "Total" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="max-w-xs flex-1">
          <label htmlFor="attendance-search" className="sr-only">
            Search records
          </label>
          <input
            id="attendance-search"
            type="text"
            placeholder="Search event, slug, or notes..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
          />
        </div>
        <div>
          <label htmlFor="attendance-format-filter" className="sr-only">
            Filter by format
          </label>
          <select
            id="attendance-format-filter"
            value={formatFilter}
            onChange={(event) =>
              setFormatFilter(event.target.value as AttendanceFormat | "all")
            }
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-etsa-primary focus:outline-none focus:ring-1 focus:ring-etsa-primary"
          >
            <option value="all">All formats</option>
            <option value="hybrid">Hybrid</option>
            <option value="in-person">In-person</option>
            <option value="virtual">Virtual</option>
          </select>
        </div>
      </div>

      {visibleRecords.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No records match your search.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {columns.map((column) => (
                  <th
                    key={column.field}
                    className="py-2 pr-4 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort(column.field)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      <SortIcon
                        field={column.field}
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                      />
                    </div>
                  </th>
                ))}
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-white">
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td className="py-2 pr-4">{record.eventDate}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/posts/${record.postSlug}/attendance`}
                      className="text-etsa-primary hover:underline"
                    >
                      {record.eventTitle}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{formatLabels[record.format]}</td>
                  <td className="py-2 pr-4">{record.inPersonCount}</td>
                  <td className="py-2 pr-4">{record.virtualCount}</td>
                  <td className="py-2 pr-4">
                    {record.inPersonCount + record.virtualCount}
                  </td>
                  <td className="py-2 pr-4 space-x-3">
                    <button
                      type="button"
                      className="text-etsa-primary hover:underline"
                      onClick={() => onEdit(record)}
                    >
                      Edit
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="text-red-600 dark:text-red-400 hover:underline"
                        onClick={() => onDelete(record)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
