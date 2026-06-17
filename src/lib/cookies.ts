// Cookie management utilities for RSVP form data

export interface RSVPCookieData {
  firstName: string;
  lastName: string;
  email: string;
  howDidYouHear: string;
}

const COOKIE_NAME = "etsa-rsvp-data";
const COOKIE_EXPIRY_DAYS = 365; // 1 year

/**
 * Set a cookie with the given name, value, and expiry days
 */
function setCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return; // Server-side safety

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${encodeURIComponent(
    value,
  )};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null; // Server-side safety

  const nameEQ = name + "=";
  const ca = document.cookie.split(";");

  for (const cookie of ca) {
    let c = cookie;
    while (c.startsWith(" ")) c = c.substring(1);
    if (c.startsWith(nameEQ)) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string): void {
  if (typeof document === "undefined") return; // Server-side safety

  // Mirror attributes used when setting the cookie to ensure deletion
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict;Secure`;
}

/**
 * Save RSVP form data to cookies
 */
export function saveRSVPDataToCookies(data: RSVPCookieData): void {
  try {
    const cookieData = JSON.stringify(data);
    setCookie(COOKIE_NAME, cookieData, COOKIE_EXPIRY_DAYS);
  } catch (error) {
    console.warn("Failed to save RSVP data to cookies:", error);
  }
}

/**
 * Load RSVP form data from cookies
 */
export function loadRSVPDataFromCookies(): RSVPCookieData | null {
  try {
    const cookieValue = getCookie(COOKIE_NAME);
    if (!cookieValue) return null;

    const data = JSON.parse(cookieValue) as RSVPCookieData;

    // Validate the data structure
    if (
      typeof data === "object" &&
      typeof data.firstName === "string" &&
      typeof data.lastName === "string" &&
      typeof data.email === "string" &&
      typeof data.howDidYouHear === "string"
    ) {
      return data;
    }

    return null;
  } catch (error) {
    console.warn("Failed to load RSVP data from cookies:", error);
    return null;
  }
}

/**
 * Clear saved RSVP data from cookies
 */
export function clearRSVPDataFromCookies(): void {
  deleteCookie(COOKIE_NAME);
}

/**
 * Check if RSVP data is saved in cookies
 */
export function hasRSVPDataInCookies(): boolean {
  return loadRSVPDataFromCookies() !== null;
}

/**
 * Get cookie consent status
 */
export function getCookieConsent(): boolean {
  const consent = getCookie("etsa-cookie-consent");
  return consent === "true";
}

/**
 * Set cookie consent status
 */
export function setCookieConsent(consent: boolean): void {
  setCookie("etsa-cookie-consent", consent.toString(), COOKIE_EXPIRY_DAYS);
}

/**
 * Check if cookies are supported
 */
export function areCookiesSupported(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const testCookie = "test-cookie";
    setCookie(testCookie, "test", 1);
    const supported = getCookie(testCookie) === "test";
    deleteCookie(testCookie);
    return supported;
  } catch {
    return false;
  }
}
