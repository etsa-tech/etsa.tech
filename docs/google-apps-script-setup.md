# Google Apps Script Setup for ETSA RSVP Form

This document provides complete step-by-step instructions for setting up the Google Apps Script that handles RSVP form submissions and writes them to your Google Sheet.

## Overview

The Google Apps Script acts as a webhook endpoint that:

- Receives RSVP form data from your website
- Validates the incoming data
- Writes the data to your Google Sheet in the correct format
- Returns success/error responses to the form

## Prerequisites

- Access to your ETSA RSVP Google Sheet
- Google account with edit permissions to the sheet
- Basic understanding of Google Apps Script (helpful but not required)

## Step-by-Step Setup

### Step 1: Open Your Google Sheet

1. Navigate to your RSVP Google Sheet using the link above
2. Ensure you're logged in with the correct Google account
3. Verify the sheet has the following column headers in row 1:
   - Column A: `Timestamp`
   - Column B: `Email Address`
   - Column C: `Can you attend?`
   - Column D: `What is your first name?`
   - Column E: `How did you hear about this event?`
   - Column F: `Comments and/or questions`
   - Column G: `Subscribe to our newsletter (We won't sell your email or spam you)`
   - Column H: `What is your last name?`

### Step 2: Access Google Apps Script

1. In your Google Sheet, click on **Extensions** in the menu bar
2. Select **Apps Script** from the dropdown menu
3. A new tab will open with the Google Apps Script editor
4. You'll see a default project with a `myFunction()` placeholder

### Step 3: Replace the Default Code

1. **Delete all existing code** in the editor
2. **Copy and paste the following code exactly:**

```javascript
/**
 * ETSA RSVP Form Handler
 * Processes RSVP submissions from the ETSA website and writes them to the Google Sheet
 */

function doPost(e) {
  try {
    // Get the active spreadsheet (your RSVP sheet)
    const sheet = SpreadsheetApp.getActiveSheet();

    // Log the incoming request for debugging
    console.log("Received RSVP submission:", e.postData.contents);

    // Parse the incoming JSON data from the RSVP form
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.canAttend) {
      console.error("Missing required fields:", data);
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error:
            "Missing required fields: firstName, lastName, email, or canAttend",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      console.error("Invalid email format:", data.email);
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Invalid email format",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Prepare the row data to match your sheet columns exactly
    const rowData = [
      data.timestamp || new Date().toISOString(), // Column A: Timestamp
      data.email, // Column B: Email Address
      data.canAttend, // Column C: Can you attend?
      data.firstName, // Column D: What is your first name?
      data.howDidYouHear || "", // Column E: How did you hear about this event?
      data.comments || "", // Column F: Comments and/or questions
      data.subscribeToNewsletter ? "Yes" : "No", // Column G: Subscribe to our newsletter
      data.lastName, // Column H: What is your last name?
    ];

    // Append the data to the sheet
    sheet.appendRow(rowData);

    // Log the successful submission
    console.log("RSVP recorded successfully:", {
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      canAttend: data.canAttend,
      timestamp: rowData[0],
    });

    // Return success response
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "RSVP recorded successfully",
        timestamp: rowData[0],
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error processing RSVP:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: "Internal server error: " + error.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests for testing and health checks
 */
function doGet(e) {
  const timestamp = new Date().toISOString();
  console.log("Health check request received at:", timestamp);

  return ContentService.createTextOutput(
    `ETSA RSVP webhook is running - ${timestamp}`,
  ).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Test function to verify the script works
 * You can run this manually to test
 */
function testRSVPSubmission() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        canAttend: "Yes",
        howDidYouHear: "Testing",
        comments: "This is a test submission",
        subscribeToNewsletter: true,
        timestamp: new Date().toISOString(),
      }),
    },
  };

  const result = doPost(testData);
  console.log("Test result:", result.getContent());
}
```

### Step 4: Save the Script

1. Click the **Save** button (💾 icon) or press `Ctrl+S` (Windows) / `Cmd+S` (Mac)
2. When prompted for a project name, enter: **ETSA RSVP Webhook**
3. Click **Save**

### Step 5: Deploy as Web App

1. Click the **Deploy** button in the top-right corner
2. Select **New deployment**
3. Click the gear icon ⚙️ next to "Type"
4. Select **Web app** from the dropdown
5. Configure the deployment settings:
   - **Description**: `ETSA RSVP Form Handler v1.0`
   - **Execute as**: **Me** (your email address)
   - **Who has access**: **Anyone** ⚠️ _This is crucial for the webhook to work_
6. Click **Deploy**

### Step 6: Authorize the Script

1. You'll see a popup requesting permissions
2. Click **Authorize access**
3. Select your Google account
4. You may see a "Google hasn't verified this app" warning
5. Click **Advanced** → **Go to ETSA RSVP Webhook (unsafe)**
6. Review the permissions and click **Allow**

### Step 7: Copy the Webhook URL

1. After successful deployment, you'll see a **Web app URL**
2. It will look like: `https://script.google.com/macros/s/AKfycbx...../exec`
3. **Copy this entire URL** - you'll need it for Netlify configuration

### Step 8: Test the Deployment

1. Open the webhook URL in your browser
2. You should see: `ETSA RSVP webhook is running - [timestamp]`
3. If you see this message, the deployment was successful

## Configuration for Netlify

Add the webhook URL to your Netlify environment variables:

1. Go to your Netlify dashboard
2. Select your ETSA site
3. Navigate to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Set:
   - **Key**: `GOOGLE_SHEETS_WEBHOOK_URL`
   - **Value**: The webhook URL from Step 7
6. Click **Save**
7. Redeploy your site for the changes to take effect

## Testing the Complete Flow

### Manual Testing

You can test the webhook directly using curl:

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "canAttend": "Yes",
    "howDidYouHear": "Testing",
    "comments": "Test submission",
    "subscribeToNewsletter": true,
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

### Using the Test Function

1. In the Apps Script editor, select `testRSVPSubmission` from the function dropdown
2. Click the **Run** button
3. Check the **Logs** (View → Logs) for the result
4. Verify a test row was added to your Google Sheet

## Monitoring and Maintenance

### Viewing Logs

1. In the Apps Script editor, go to **View** → **Logs**
2. You'll see all function executions and any errors
3. Logs are helpful for debugging issues

### Updating the Script

If you need to make changes:

1. Edit the code in the Apps Script editor
2. Save the changes
3. Create a new deployment or update the existing one
4. The webhook URL will remain the same for updates

### Security Considerations

- The script runs with your Google account permissions
- Only your RSVP form should know the webhook URL
- The script validates incoming data before processing
- All submissions are logged for audit purposes

## Troubleshooting

### Common Issues

| Issue                         | Solution                                              |
| ----------------------------- | ----------------------------------------------------- |
| "Script function not found"   | Ensure you saved the script and deployed it correctly |
| "Permission denied"           | Check that deployment access is set to "Anyone"       |
| "Data not appearing in sheet" | Check the Apps Script logs for errors                 |
| "Invalid JSON" error          | Verify the form is sending properly formatted JSON    |

### Debugging Steps

1. **Check the logs**: View → Logs in Apps Script editor
2. **Test the webhook URL**: Visit it in browser to see if it responds
3. **Run the test function**: Use `testRSVPSubmission()` to verify functionality
4. **Check sheet permissions**: Ensure the script can write to your sheet
5. **Verify column headers**: Make sure they match exactly

### Getting Help

If you encounter issues:

1. Check the Apps Script logs first
2. Verify the webhook URL is correct in Netlify
3. Test with the manual curl command
4. Ensure your Google Sheet has the correct column headers

## Security and Privacy

- The script only processes data sent from your RSVP form
- No data is stored outside of your Google Sheet
- All processing happens within Google's secure environment
- Logs are only accessible to you as the script owner
