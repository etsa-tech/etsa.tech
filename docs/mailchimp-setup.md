# Mailchimp Integration Setup

This document explains how to set up the Mailchimp integration for the ETSA RSVP form mailing list subscription.

## Overview

When users check the "Subscribe to our mailing list" option on the RSVP form, their information is sent to a Netlify serverless function that uses the Mailchimp API to add them to your mailing list.

## Setup Steps

### 1. Get Mailchimp API Credentials

1. Log in to your Mailchimp account
2. Go to Account > Extras > API keys
3. Create a new API key or use an existing one
4. Note your server prefix (e.g., "us1", "us2") from your account URL

### 2. Get Your List ID

1. In Mailchimp, go to Audience > All contacts
2. Click on "Settings" dropdown
3. Select "Audience name and defaults"
4. Copy the "Audience ID" (this is your list ID)

### 3. Set Environment Variables

Add the following environment variables to your Netlify deployment:

```bash
MAILCHIMP_API_KEY=your_api_key_here
MAILCHIMP_LIST_ID=your_list_id_here
MAILCHIMP_SERVER_PREFIX=us1  # or us2, us3, etc.
```

### 4. Configure Netlify Environment Variables

1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings > Environment variables
4. Add the three Mailchimp variables listed above

## Testing the Integration

### Test the Full RSVP Flow

1. Go to `/rsvp` on your website
2. Fill out the form and check "Subscribe to our mailing list"
3. Submit the form
4. Check your Mailchimp audience to see if the contact was added

## Mailchimp API Features Used

### Subscription Process

The integration:

- Adds contacts with "subscribed" status
- Sets first and last name from the provided name
- Adds tags: "ETSA Website" and "RSVP Signup"
- Handles duplicate email addresses gracefully
- If the email already exists Mailchimp returns a 200, we will **NOT** error out on this as that would provide user enumeration.

### Error Handling

The function handles common scenarios:

- **Duplicate emails**: Returns success (user already subscribed)
- **Invalid emails**: Returns validation error
- **API errors**: Returns appropriate error messages
- **Network issues**: Returns generic error message

## Customization Options

### Adding Custom Fields

If you have custom merge fields in Mailchimp, you can modify the function:

```javascript
merge_fields: {
  FNAME: firstName,
  LNAME: lastName,
  COMPANY: "Your Company", // Custom field
  INTERESTS: "Tech Meetups", // Custom field
},
```

### Adding More Tags

You can add more specific tags:

```javascript
tags: [
  "ETSA Website",
  "RSVP Signup",
  "2024 Members", // Year-specific tag
  "Knoxville", // Location tag
],
```

### Interest Groups

If you use Mailchimp interest groups:

```javascript
interests: {
  "interest_group_id_1": true,
  "interest_group_id_2": false,
},
```

## Security Considerations

- API keys are stored securely in Netlify environment variables
- The function validates email format before making API calls
- Rate limiting is handled by Netlify's function limits
- No sensitive data is logged in function responses

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check that your API key is correct and active
2. **"List not found"**: Verify your list ID is correct
3. **"Invalid server prefix"**: Ensure the server prefix matches your account
4. **CORS errors**: These should be handled automatically by the function

### Debugging Steps

1. Check Netlify function logs in your dashboard
2. Test the API credentials with Mailchimp's API playground
3. Verify environment variables are set correctly
4. Test with a simple curl request first

### Mailchimp API Limits

- Free accounts: 10,000 emails/month, 2,000 contacts
- API rate limit: 10 requests/second
- The function includes appropriate error handling for rate limits

## Advanced Features

### Double Opt-in

To require email confirmation:

```javascript
status: "pending", // Instead of "subscribed"
```

### Welcome Email

Mailchimp can automatically send welcome emails when configured in your audience settings.

### Webhooks

You can set up Mailchimp webhooks to notify your system when users subscribe/unsubscribe.

## Monitoring

### Success Metrics

Monitor these in your Netlify dashboard:

- Function invocation count
- Success/error rates
- Response times

### Mailchimp Analytics

Track subscription sources in Mailchimp:

- Go to Reports > Landing pages
- Filter by "ETSA Website" tag
- Monitor growth from website RSVPs

## Compliance

### GDPR/Privacy

- Users explicitly opt-in via checkbox
- Consider adding privacy policy link
- Mailchimp handles unsubscribe links automatically

### CAN-SPAM

- Mailchimp automatically includes required unsubscribe links
- Your organization info is included from Mailchimp settings
- Physical address is required in Mailchimp account settings
