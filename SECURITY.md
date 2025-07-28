# Security Guidelines for ETSA.tech

## Overview

This document outlines security considerations and best practices for deploying and maintaining the ETSA.tech website.

## Security Measures Implemented

### 1. Input Sanitization

#### HTML Content Sanitization

- **Library**: `sanitize-html` v2.17.0
- **Usage**: All user-generated content and markdown processing
- **Configuration**: Strict allowlist approach for HTML tags and attributes

```typescript
// Example from utils.ts
const sanitizedContent = sanitizeHtml(content, {
  allowedTags: [], // Remove all HTML tags for excerpts
  allowedAttributes: {}, // Remove all attributes
  textFilter: function (text) {
    return text; // Additional text filtering if needed
  },
});
```

#### ReDoS-Safe Regex Patterns

```typescript
// BEFORE (vulnerable to catastrophic backtracking):
.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Dangerous nested quantifiers

// AFTER (safe, non-backtracking):
.replace(/\[[^\]]*\]\([^)]*\)/g, (match) => {
  const textMatch = match.match(/^\[([^\]]*)\]/);
  return textMatch ? textMatch[1] : "";
})

// Input length limits to prevent resource exhaustion:
const maxInputLength = 200;
const safeTerm = searchTerm.slice(0, maxInputLength).trim();
```

#### Search Input Sanitization

- **Purpose**: Prevent XSS attacks and ReDoS through search functionality
- **Implementation**: Input length limits, safe regex patterns, HTML bracket removal
- **ReDoS Prevention**: Maximum input length (200 chars) and non-backtracking patterns
- **Location**: `src/lib/utils.ts` - `sanitizeSearchInput()`

#### Regular Expression Security (ReDoS Prevention)

- **Vulnerability**: Catastrophic backtracking in regex patterns
- **Mitigation**: Non-backtracking patterns, input length limits, safe alternatives
- **Implementation**: All regex patterns reviewed and hardened against ReDoS attacks

### 2. Secure External Component Integration

#### hCaptcha Integration (Secure Implementation)

- **Security Approach**: Official React component instead of manual script loading
- **Benefits**:
  - No manual script injection vulnerabilities
  - Managed by official hCaptcha library with security updates
  - Proper TypeScript types and error handling
  - Eliminates need for SRI (script integrity handled by package manager)

```typescript
// Secure implementation using official React component
import HCaptcha from "@hcaptcha/react-hcaptcha";

<HCaptcha
  ref={captchaRef}
  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
  onVerify={handleCaptchaVerify}
  onExpire={handleCaptchaExpire}
  onError={handleCaptchaError}
  theme="light"
  size="normal"
/>
```

#### Security Benefits of Official React Component

- **No Script Injection**: Eliminates manual DOM script injection vulnerabilities
- **Package Integrity**: Scripts loaded through npm with package-lock.json integrity
- **Managed Updates**: Security updates handled through dependency management
- **Type Safety**: Full TypeScript support prevents runtime errors
- **CSP Compliance**: Better compatibility with Content Security Policy
- **Error Boundaries**: Proper React error handling and recovery

### 3. URL Encoding

#### Slug Handling

- **Implementation**: All dynamic route parameters are properly encoded
- **Purpose**: Prevent path traversal and injection attacks
- **Location**: `src/lib/utils.ts` - `getPostUrl()` and meeting-info page

```typescript
// Example
href={`/speakers/${encodeURIComponent(latestPost.slug)}`}
```

## Deployment Security Recommendations

### 1. Web Server Configuration

#### Content Security Policy (CSP)

Implement the following CSP header at your web server level:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.hcaptcha.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://hcaptcha.com; frame-src https://hcaptcha.com
```

#### Additional Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 2. HTTPS Configuration

#### Requirements

- **TLS Version**: Minimum TLS 1.2, prefer TLS 1.3
- **Certificate**: Use valid SSL/TLS certificates
- **HSTS**: Enable HTTP Strict Transport Security
- **Redirect**: Force HTTPS redirects for all HTTP requests

### 3. Static File Security

#### File Permissions

- Ensure static files have appropriate read-only permissions
- Restrict access to sensitive files (`.env`, config files)
- Use proper directory permissions (755 for directories, 644 for files)

#### Content Validation

- Validate all uploaded images and assets
- Implement file type restrictions
- Use virus scanning for user uploads (if implemented)

## Environment Variables Security

### Required Environment Variables

```bash
# hCaptcha Configuration
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_site_key_here
HCAPTCHA_SECRET_KEY=your_secret_key_here

# Organization Details
NEXT_PUBLIC_ORG_NAME="East Tennessee Systems Administration"
NEXT_PUBLIC_ORG_LOCATION="Knoxville, TN"
NEXT_PUBLIC_ORG_FOUNDED_YEAR="2019"

# External Links
NEXT_PUBLIC_GITHUB_URL="https://github.com/etsa"
NEXT_PUBLIC_LINKEDIN_URL="https://linkedin.com/company/etsa"
NEXT_PUBLIC_MEETUP_URL="https://meetup.com/etsa"
NEXT_PUBLIC_EMAIL="contact@etsa.tech"

# Google Sheets Integration (for RSVP form)
GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"

# Mailchimp Integration (for mailing list subscription)
MAILCHIMP_API_KEY="your_mailchimp_api_key_here"
MAILCHIMP_LIST_ID="your_mailchimp_list_id_here"
MAILCHIMP_SERVER_PREFIX="us1"  # or us2, us3, etc. based on your account
```

### Security Best Practices

- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate API keys regularly
- Implement proper secret management in production

## Monitoring and Logging

### Recommended Monitoring

1. **Error Tracking**: Implement error monitoring (e.g., Sentry)
2. **Access Logs**: Monitor web server access logs
3. **Security Scanning**: Regular vulnerability scans
4. **Dependency Updates**: Monitor for security updates

### Log Security

- Sanitize logs to prevent information disclosure
- Implement log rotation and retention policies
- Secure log storage and access

## Incident Response

### Security Incident Checklist

1. **Immediate Response**

   - Isolate affected systems
   - Preserve evidence
   - Assess impact

2. **Investigation**

   - Review logs and access patterns
   - Identify attack vectors
   - Document findings

3. **Recovery**

   - Apply security patches
   - Update configurations
   - Restore from clean backups if needed

4. **Post-Incident**
   - Update security measures
   - Review and improve procedures
   - Communicate with stakeholders

## Regular Security Maintenance

### Monthly Tasks

- [ ] Review and update dependencies
- [ ] Check for security advisories
- [ ] Review access logs for anomalies
- [ ] Verify backup integrity

### Quarterly Tasks

- [ ] Security audit of configurations
- [ ] Penetration testing (if applicable)
- [ ] Review and update security policies
- [ ] Update incident response procedures

### Annual Tasks

- [ ] Comprehensive security assessment
- [ ] Review and update all security documentation
- [ ] Security training for team members
- [ ] Disaster recovery testing

## Contact Information

For security-related issues or questions:

- **Emergency**: Contact through official ETSA channels
- **Reporting**: Use responsible disclosure practices

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Guidelines](https://nextjs.org/docs/advanced-features/security-headers)
- [hCaptcha Documentation](https://docs.hcaptcha.com/)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
