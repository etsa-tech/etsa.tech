import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { isAttendanceSheetsConfigured } from "@/lib/attendance-sheets-sync";
import { validateAttendanceRecordInput } from "@/lib/validation";
import {
  getAttendanceRecordByPostSlug,
  listAttendanceRecords,
  saveAttendanceRecord,
} from "@/lib/attendance-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await listAttendanceRecords();
    return NextResponse.json({
      records,
      canDelete: !isAttendanceSheetsConfigured(),
    });
  } catch (error) {
    console.error("Error listing attendance records:", error);
    return NextResponse.json(
      { error: "Failed to list attendance records" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!isAuthorizedUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateAttendanceRecordInput(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid attendance record", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    const now = new Date().toISOString();

    // At most one record is expected per post (see getAttendanceRecordByPostSlug) -
    // enforce that server-side too, not just via the bulk-import UI's dedup, so a
    // stale client (e.g. a second import run before the record list reloads) can't
    // create a duplicate for the same event.
    const existing = await getAttendanceRecordByPostSlug(
      validation.data.postSlug,
    );

    if (existing) {
      const { record } = await saveAttendanceRecord(
        {
          ...existing,
          ...validation.data,
          updatedAt: now,
          updatedBy: session!.user?.email ?? null,
        },
        existing,
      );

      return NextResponse.json({ record });
    }

    const { record } = await saveAttendanceRecord({
      id: randomUUID(),
      ...validation.data,
      createdAt: now,
      updatedAt: now,
      updatedBy: session!.user?.email ?? null,
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance record:", error);
    return NextResponse.json(
      {
        error: "Failed to create attendance record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
