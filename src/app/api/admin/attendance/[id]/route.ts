import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { isAttendanceSheetsConfigured } from "@/lib/attendance-sheets-sync";
import { validateAttendanceRecordInput } from "@/lib/validation";
import {
  deleteAttendanceRecord,
  getAttendanceRecord,
  saveAttendanceRecord,
} from "@/lib/attendance-store";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await getAttendanceRecord(id);

  if (!record) {
    return NextResponse.json(
      { error: "Attendance record not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ record });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getAttendanceRecord(id);

  if (!existing) {
    return NextResponse.json(
      { error: "Attendance record not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const validation = validateAttendanceRecordInput(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid attendance record", details: validation.errors },
      { status: 400 },
    );
  }

  // Records are keyed by postSlug, so re-linking this record to a different
  // post (the picker allows that outside the locked-post view) means moving
  // it to a new key - make sure that doesn't clobber another post's record.
  const newId = validation.data.postSlug;
  if (newId !== id && (await getAttendanceRecord(newId))) {
    return NextResponse.json(
      { error: "Another attendance record is already linked to that post" },
      { status: 409 },
    );
  }

  try {
    const { record } = await saveAttendanceRecord(
      {
        ...existing,
        ...validation.data,
        id: newId,
        updatedAt: new Date().toISOString(),
        updatedBy: session!.user?.email ?? null,
      },
      newId === id ? existing : null,
    );

    // Only drop the old key once the new one is confirmed written, so a
    // failed save (e.g. the Sheets mirror) leaves the original untouched.
    if (newId !== id) {
      await deleteAttendanceRecord(id);
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return NextResponse.json(
      {
        error: "Failed to update attendance record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAttendanceSheetsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Deleting attendance records is only allowed when ATTENDANCE_SHEETS_WEBHOOK_URL isn't configured (local development)",
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  const existing = await getAttendanceRecord(id);

  if (!existing) {
    return NextResponse.json(
      { error: "Attendance record not found" },
      { status: 404 },
    );
  }

  try {
    await deleteAttendanceRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete attendance record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
