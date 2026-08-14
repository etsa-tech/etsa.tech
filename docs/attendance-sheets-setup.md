# Google Apps Script Setup for ETSA Attendance Tracking

This document describes the Apps Script webhook that mirrors admin-portal
attendance **creates and edits** to a Google Sheet. It follows the same
pattern as [docs/google-apps-script-setup.md](./google-apps-script-setup.md)
(the RSVP form's webhook), but is a **separate deployment on a separate
sheet** - the RSVP script only ever appends rows, while this one needs to
update a row by ID when an admin edits an existing attendance record.

## Overview

Netlify Blobs is the app's read/aggregation store for attendance data (fast
reads for the yearly/overall averages shown in the admin portal and on the
public `/attendance` page), and this webhook keeps a Google Sheet copy in
sync with it.

When `ATTENDANCE_SHEETS_WEBHOOK_URL` is configured, a create/edit in
`/admin/attendance` writes to Blobs and this webhook concurrently, and only
succeeds if **both** succeed - if this webhook fails, the Blobs write is
rolled back (the new record is deleted, or an edited record is restored to
its previous value) and the admin request fails, so the two stores can't
drift apart. "Succeeds" isn't just a 200 from `doPost` - the app also reads
the row back via `doGet(?id=...)` and checks the counts match
(`verifyAttendanceRecordInSheets` in `src/lib/attendance-sheets-sync.ts`),
because bulk import fires many creates/edits concurrently and an unlocked
Apps Script write can silently drop or clobber a row while still reporting
success. The `LockService` call in `doPost` below and the `doGet(?id=...)`
lookup exist specifically for that: the lock stops the collision from
happening, the read-back catches it if it somehow still does. **Both
pieces are required together** - the read-back can't do its job against an
older deployment of this script that doesn't have `doGet(?id=...)` (every
save's verification step will fail), and the lock alone doesn't give the
app a way to confirm the write actually landed.

When it **isn't** configured (local development - see
`isAttendanceSheetsConfigured` in `src/lib/attendance-sheets-sync.ts`), a
create/edit skips the Sheets call entirely and just writes to Blobs, so
local testing never needs a real webhook and never fails because one isn't
set up.

**Deletes never reach this webhook at all.** Deleting an attendance record
is only allowed when `ATTENDANCE_SHEETS_WEBHOOK_URL` isn't configured -
blocked with a 403 otherwise (see
`isAttendanceSheetsConfigured` in `src/lib/attendance-sheets-sync.ts`) - and
only ever removes the record from Blobs, never from this Sheet. In practice
that env var is only set in the deployed Netlify environment, so this also
doubles as a local-development-only gate: a developer's local `.env`
deliberately leaves it unset, both so local testing doesn't need a real
webhook and so deleting stays possible while testing locally. The Sheet is
the durable, hard-to-lose copy specifically because nothing in the deployed
app can delete from it.

## Step 1: Prepare the Sheet

Create a **tab named exactly `Attendance`** in your Google Sheet - the script
below targets that sheet name explicitly (via `getSheetByName`) rather than
relying on whichever tab happens to be active when the webhook fires, since
this workbook may also hold other tabs (e.g. RSVPs). Add these column headers
in row 1:

- Column A: `ID` (the attendance record's UUID - the key this script uses to
  find an existing row to update)
- Column B: `Event Date`
- Column C: `Post Slug`
- Column D: `Event Title`
- Column E: `Format` (`in-person` / `virtual` / `hybrid`)
- Column F: `In-Person Count`
- Column G: `Virtual Count`
- Column H: `Notes`
- Column I: `Updated At`
- Column J: `Updated By`

## Step 2: Add the Apps Script

In the sheet, go to **Extensions → Apps Script**, delete the placeholder
code, and paste:

```javascript
// Hard-coded to a specific tab, not SpreadsheetApp.getActiveSheet() - the
// "active" sheet depends on whichever tab a human last had open, which is
// not a safe thing for a webhook to depend on, especially in a workbook
// that may also hold other tabs (e.g. RSVPs).
const SHEET_NAME = "Attendance";

function getAttendanceSheet() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet tab "' + SHEET_NAME + '" not found');
  }
  return sheet;
}

function doPost(e) {
  // Bulk import can fire many creates/edits concurrently. Without a lock,
  // two requests can both read "no existing row for this id" and both
  // append, or one can overwrite the other's write mid-flight - the script
  // would still report success either way, so the app-side caller (see
  // verifyAttendanceRecordInSheets in src/lib/attendance-sheets-sync.ts)
  // can't tell from the response alone. The lock makes each request's
  // find-then-write atomic relative to the others.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch {
    return jsonResponse({
      success: false,
      error: "Could not acquire lock - too many concurrent writes",
    });
  }

  try {
    const sheet = getAttendanceSheet();
    const data = JSON.parse(e.postData.contents);

    if (!data.id) {
      return jsonResponse({ success: false, error: "Missing id" });
    }

    const rowIndex = findRowById(sheet, data.id);

    const rowData = [
      data.id,
      data.eventDate || "",
      data.postSlug || "",
      data.eventTitle || "",
      data.format || "",
      data.inPersonCount ?? "",
      data.virtualCount ?? "",
      data.notes || "",
      data.updatedAt || "",
      data.updatedBy || "",
    ];

    if (rowIndex === -1) {
      sheet.appendRow(rowData);
    } else {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    }

    SpreadsheetApp.flush();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error processing attendance sync:", error);
    return jsonResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// No `id` param: health check (used to confirm the deployment is live).
// With `id`: looks up that row - used by verifyAttendanceRecordInSheets to
// confirm a write actually landed, since doPost reporting success doesn't
// guarantee that on its own (see the lock comment above).
function doGet(e) {
  const id = e.parameter && e.parameter.id;

  if (!id) {
    return ContentService.createTextOutput(
      "ETSA Attendance webhook is running - " + new Date().toISOString(),
    ).setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const sheet = getAttendanceSheet();
    const rowIndex = findRowById(sheet, id);

    if (rowIndex === -1) {
      return jsonResponse({ found: false });
    }

    const values = sheet.getRange(rowIndex, 1, 1, 10).getValues()[0];
    return jsonResponse({
      found: true,
      row: {
        id: values[0],
        eventDate: values[1],
        postSlug: values[2],
        eventTitle: values[3],
        format: values[4],
        inPersonCount: values[5],
        virtualCount: values[6],
        notes: values[7],
        updatedAt: values[8],
        updatedBy: values[9],
      },
    });
  } catch (error) {
    console.error("Error reading attendance row:", error);
    return jsonResponse({ found: false, error: error.toString() });
  }
}

function findRowById(sheet, id) {
  const ids = sheet.getRange("A2:A").getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2; // +2: header row + 1-indexing
  }
  return -1;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
```

## Step 3: Deploy

> **Already have this webhook deployed?** The `LockService` locking and the
> `doGet(?id=...)` row lookup above are required by the app's verification
> step (see Overview) - an older deployment without them will fail
> verification on **every** save, since `syncAttendanceRecordToSheets`
> always calls `doGet(?id=...)` after posting. Update the script and
> redeploy it (**Deploy → Manage deployments → edit the existing
> deployment → New version**, which keeps the same web app URL, so
> `ATTENDANCE_SHEETS_WEBHOOK_URL` doesn't need to change) **before** the
> updated app code ships - not after.

Same as the RSVP webhook (see
[docs/google-apps-script-setup.md](./google-apps-script-setup.md#step-5-deploy-as-web-app)):
**Deploy → New deployment → Web app**, execute as yourself, access **Anyone**.
Copy the resulting web app URL.

## Step 4: Configure Netlify

Set `ATTENDANCE_SHEETS_WEBHOOK_URL` (not `GOOGLE_SHEETS_WEBHOOK_URL`, which is
the RSVP form's webhook) to that URL in Netlify's environment variables, then
redeploy.

## Testing

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-id",
    "eventDate": "2026-01-01",
    "postSlug": "2026-01-06-january-social",
    "eventTitle": "January Social Event",
    "format": "hybrid",
    "inPersonCount": 10,
    "virtualCount": 3,
    "updatedAt": "2026-01-01T00:00:00Z",
    "updatedBy": "board@etsa.tech"
  }'
```

Should add or update a row keyed on `id`. Re-run with different counts and
the same `id` to confirm it updates the existing row rather than appending a
new one.

Then confirm the read-back the app relies on for verification:

```bash
curl "YOUR_WEBHOOK_URL?id=test-id"
```

Should return `{"found":true,"row":{...}}` with the counts from the last
POST. `curl "YOUR_WEBHOOK_URL?id=no-such-id"` should return
`{"found":false}`, and `curl "YOUR_WEBHOOK_URL"` (no `id`) should still
return the plain-text health check.
