import nodemailer from "nodemailer";

// Email configuration
export function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure:
      process.env.SMTP_TLS === "true" &&
      parseInt(process.env.SMTP_PORT || "587") === 465,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS === "true",
    },
  };

  // Validate required environment variables
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST environment variable is required");
  }
  if (!process.env.SMTP_USERNAME) {
    throw new Error("SMTP_USERNAME environment variable is required");
  }
  if (!process.env.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD environment variable is required");
  }
  if (!process.env.SMTP_FROM) {
    throw new Error("SMTP_FROM environment variable is required");
  }
  if (!process.env.SMTP_TO) {
    throw new Error("SMTP_TO environment variable is required");
  }

  return nodemailer.createTransport(config);
}

// HCaptcha verification
export async function verifyHCaptcha(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.HCAPTCHA_SECRET_KEY) {
      throw new Error("HCAPTCHA_SECRET_KEY environment variable is required");
    }

    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      console.error("HCaptcha verification failed:", data);
      return {
        success: false,
        error: "Captcha verification failed. Please try again.",
      };
    }
  } catch (error) {
    console.error("HCaptcha verification error:", error);
    return {
      success: false,
      error: "Captcha verification error. Please try again.",
    };
  }
}
