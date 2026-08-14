export type SortDirection = "asc" | "desc";

interface SortIconProps<Field extends string> {
  readonly field: Field;
  readonly currentSortField: Field;
  readonly sortDirection: SortDirection;
}

// Shared by any admin table with clickable, sortable column headers (see
// AttendanceTable.tsx and the attendance-by-speaker page).
export function SortIcon<Field extends string>({
  field,
  currentSortField,
  sortDirection,
}: SortIconProps<Field>) {
  if (currentSortField !== field) {
    return <span className="text-gray-400">↕️</span>;
  }
  return (
    <span className="text-etsa-primary">
      {sortDirection === "asc" ? "↑" : "↓"}
    </span>
  );
}
