# Google Maps Integration Setup

This document explains how to set up the Google Maps integration for the ETSA website location maps.

## Overview

The ETSA website uses Google Maps to display meeting location maps on the `/meeting-info` page. For security reasons, the Google Maps API key is kept private on the server-side and accessed through a secure API route.

## Security Architecture

### After (Secure)

- Google Maps API key is private as `GOOGLE_MAPS_API_KEY`
- API key is only accessible on the server-side
- Client requests map embed URLs through `/api/maps/embed` endpoint
- API key never exposed to client-side code

## Setup Steps

### 1. Get Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps Embed API**
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **API Key**
6. Copy the API key
7. **Important**: Restrict the API key to only the Maps Embed API for security

### 2. Configure API Key Restrictions

For security, restrict your API key:

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Under **API restrictions**, select **Restrict key**
4. Choose **Maps Embed API**
5. Under **Website restrictions**, add your domain(s):
   - `https://etsa.tech/*`
   - `https://localhost:3000/*` (for development)

### 3. Set Environment Variable

Add the API key as a **private** environment variable:

```bash
# Private Google Maps API key (server-side only)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Important**: Do NOT use `NEXT_PUBLIC_` prefix - this would expose the key to client-side code.

### 4. Configure in Deployment

#### For Netlify:

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add variable:
   - **Key**: `GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key
5. Redeploy your site

## How It Works

### API Route (`/api/maps/embed`)

- Accepts `address` and optional `zoom` parameters
- Validates input parameters
- Constructs Google Maps Embed URL using private API key
- Returns embed URL to client

### Client Component (`GoogleMapEmbed`)

- Makes request to `/api/maps/embed` with address
- Displays loading state while fetching
- Shows error state with fallback link if API fails
- Renders iframe with embed URL when successful

### Usage Example

```tsx
import GoogleMapEmbed from "@/components/GoogleMapEmbed";

<GoogleMapEmbed
  address="17 Market Square SUITE 101, Knoxville, TN 37902"
  zoom={15}
  className="w-full h-96"
  title="Meeting Location Map"
/>;
```

## Benefits

1. **Security**: API key never exposed to client-side
2. **Control**: Server-side validation of requests
3. **Monitoring**: All map requests go through your API
4. **Flexibility**: Easy to add caching, rate limiting, or logging
5. **Fallback**: Graceful error handling with direct Google Maps links

## Troubleshooting

### Common Issues

1. **Map not loading**: Check that `GOOGLE_MAPS_API_KEY` is set correctly
2. **API key errors**: Verify API key restrictions in Google Cloud Console
3. **Quota exceeded**: Monitor usage in Google Cloud Console
4. **CORS errors**: Should not occur since requests are server-to-server

### Debugging

Check the browser console and network tab for error messages. The API route will log errors on the server side for debugging.

### Testing

You can test the API route directly:

```
GET /api/maps/embed?address=17%20Market%20Square%20SUITE%20101,%20Knoxville,%20TN%2037902&zoom=15
```

Should return:

```json
{
  "embedUrl": "https://www.google.com/maps/embed/v1/place?key=...",
  "address": "17 Market Square SUITE 101, Knoxville, TN 37902",
  "zoom": 15
}
```
