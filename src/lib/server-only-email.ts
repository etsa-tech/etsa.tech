import { createTransporter } from "./email-config";

// Server-only email functions
export async function sendContactEmail(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
  hostname?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error("SMTP configuration error:", verifyError);
      return {
        success: false,
        error: "Email service configuration error. Please try again later.",
      };
    }

    const { name, email, subject, message, hostname } = formData;

    // Email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Contact Form Submission - ETSA</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0197d6; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #00608a; }
            .value { margin-top: 5px; padding: 10px; background-color: white; border-left: 3px solid #0197d6; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Form Submission</h1>
              <p>ETSA Website Contact Form</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${escapeHtml(name)}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${escapeHtml(email)}</div>
              </div>
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${escapeHtml(subject)}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${escapeHtml(message).replace(
                  /\n/g,
                  "<br>",
                )}</div>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent from the ETSA website contact form.</p>
              <p>Hostname: ${hostname || "Unknown"}</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
New Contact Form Submission - ETSA

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This email was sent from the ETSA website contact form.
Hostname: ${hostname || "Unknown"}
Timestamp: ${new Date().toISOString()}
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"ETSA Contact Form" <${process.env.SMTP_FROM}>`,
      to: process.env.SMTP_TO,
      replyTo: email,
      subject: `[ETSA Contact] ${subject}`,
      text: textContent,
      html: htmlContent,
    });

    console.log("Contact email sent successfully:", info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Error sending contact email:", error);
    return {
      success: false,
      error: "Failed to send email. Please try again later.",
    };
  }
}

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
