# Google Sheets RSVP Integration Setup

This document explains how to set up the Google Sheets integration for the ETSA RSVP form.

## Overview

The RSVP form submits data to a Google Apps Script web app, which then writes the data to a Google Sheet. This approach allows us to maintain our existing Google Sheets workflow while providing a custom form experience.

## Setup Steps

### 1. Create or Prepare Your Google Sheet

1. Open your existing RSVP Google Sheet: https://docs.google.com/spreadsheets/d/1uB4vb3kYuDMrsRMrYbJARe8D6vsRuOyxDxHOxjBvUVs/
2. Ensure the first row contains headers matching your current structure:
   - `Timestamp`
   - `Email Address`
   - `Can you attend?`
   - `What is your first name?`
   - `How did you hear about this event?`
   - `Comments and/or questions`
   - `Subscribe to our newsletter (We won't sell your email or spam you)`
   - `What is your last name?`

### 2. Create Google Apps Script

1. In your Google Sheet, go to `Extensions > Apps Script`
2. Replace the default code with the following:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSheet();

    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.canAttend) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Prepare the row data to match your sheet columns
    const rowData = [
      data.timestamp || new Date().toISOString(), // Timestamp
      data.email, // Email Address
      data.canAttend, // Can you attend?
      data.firstName, // What is your first name?
      data.howDidYouHear || "", // How did you hear about this event?
      data.comments || "", // Comments and/or questions
      data.subscribeToNewsletter ? "Yes" : "No", // Subscribe to our newsletter
      data.lastName, // What is your last name?
    ];

    // Append the data to the sheet
    sheet.appendRow(rowData);

    // Return success response
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "RSVP recorded successfully",
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error processing RSVP:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Optional: Handle GET requests for testing
  return ContentService.createTextOutput(
    "ETSA RSVP webhook is running",
  ).setMimeType(ContentService.MimeType.TEXT);
}
```

### 3. Deploy the Apps Script

1. Click the "Deploy" button in the Apps Script editor
2. Choose "New deployment"
3. Set type to "Web app"
4. Set execute as "Me"
5. Set access to "Anyone" (this allows the webhook to receive data)
6. Click "Deploy"
7. Copy the web app URL - this is your `GOOGLE_SHEETS_WEBHOOK_URL`

### 4. Set Environment Variables

Add the following environment variable to your Netlify deployment:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Testing the Integration

### Test the Apps Script Directly

You can test the Google Apps Script by making a POST request:

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "meetingDate": "2024-01-15",
    "dietaryRestrictions": "None",
    "timestamp": "2024-01-01T12:00:00Z",
    "source": "Test"
  }'
```

### Test the Full RSVP Flow

1. Go to `/rsvp` on your website
2. Fill out the form
3. Submit and check your Google Sheet for the new row

## Security Considerations

- The Google Apps Script runs with your Google account permissions
- The webhook URL should be kept secure (don't commit it to public repositories)
- Consider adding additional validation in the Apps Script if needed
- The script only accepts POST requests with JSON data

## Troubleshooting

### Common Issues

1. **"Script function not found"**: Make sure you've saved and deployed the script
2. **Permission denied**: Ensure the script is deployed with "Anyone" access
3. **Data not appearing**: Check the Apps Script logs for errors
4. **CORS errors**: Apps Script automatically handles CORS for web apps

### Debugging

1. Check the Apps Script execution logs: `View > Logs` in the script editor
2. Test the webhook URL directly with curl or Postman
3. Check the Netlify function logs for any errors

## Advanced Features

### Email Notifications

You can extend the Apps Script to send email notifications:

```javascript
// Add this to the doPost function after appending the row
MailApp.sendEmail({
  to: "organizers@etsa.tech",
  subject: "New RSVP Received",
  body: `New RSVP from ${data.name} (${data.email}) for ${data.meetingDate}`,
});
```

### Data Validation

Add more robust validation:

```javascript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(data.email)) {
  return ContentService.createTextOutput(
    JSON.stringify({
      success: false,
      error: "Invalid email format",
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}
```
