export interface SheetRsvpRow {
  firstName: string;
  lastName: string;
  email: string;
  canAttend: string;
  timestamp: string;
  comments: string;
}

// Reads RSVPs back out of the Google Sheet the /rsvp form writes to, via the
// doGet handler on the same Apps Script webhook used for submissions
// (see docs/google-apps-script-setup.md). Matches by exact "Event" column
// value - that column is populated verbatim from the post's title at
// submission time, so no fuzzy matching is needed.
export async function getSheetRsvpsForEvent(
  eventTitle: string,
): Promise<SheetRsvpRow[]> {
  const googleScriptUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!googleScriptUrl || !eventTitle) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${googleScriptUrl}?event=${encodeURIComponent(eventTitle)}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google Sheets webhook returned ${response.status}`);
    }

    const result = await response.json();
    if (!Array.isArray(result?.rows)) {
      throw new TypeError("Google Sheets webhook response missing rows array");
    }

    // "Can you attend?" holds free text across years of sheet history -
    // the current form writes "Yes", older Google Form entries wrote
    // "Yes, I'll be there". Match either; exclude "No"/"Maybe".
    return (result.rows as SheetRsvpRow[]).filter(
      (row) => row.canAttend?.trim().toLowerCase().startsWith("yes"),
    );
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Failed to read RSVPs from Google Sheets:", error);
    return [];
  }
}
