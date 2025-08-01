import { z } from "zod";

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),

  subject: z
    .string()
    .min(1, "Subject is required")
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be less than 200 characters")
    .trim(),

  message: z
    .string()
    .min(1, "Message is required")
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters")
    .trim(),

  "h-captcha-response": z
    .string()
    .min(1, "Please complete the captcha verification"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Validation helper function
export function validateContactForm(
  data: unknown,
):
  | { success: true; data: ContactFormData }
  | { success: false; errors: Record<string, string[]> } {
  try {
    const validatedData = contactFormSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: {
        general: ["An unexpected validation error occurred"],
      },
    };
  }
}

// Client-side validation helper
export function getFieldError(
  errors: Record<string, string[]> | undefined,
  fieldName: string,
): string | undefined {
  return errors?.[fieldName]?.[0];
}

// Email validation regex (more permissive for international domains)
export const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[<>]/g, ""); // Remove potential HTML brackets
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Rate limiting helpers
export function createRateLimitKey(
  ip: string,
  type: "contact" = "contact",
): string {
  return `ratelimit:${type}:${ip}`;
}

// Form field validation functions for real-time validation
export function validateName(name: string): string | null {
  try {
    contactFormSchema.shape.name.parse(name);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid name";
    }
    return "Invalid name";
  }
}

export function validateEmail(email: string): string | null {
  try {
    contactFormSchema.shape.email.parse(email);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid email";
    }
    return "Invalid email";
  }
}

export function validateSubject(subject: string): string | null {
  try {
    contactFormSchema.shape.subject.parse(subject);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid subject";
    }
    return "Invalid subject";
  }
}

export function validateMessage(message: string): string | null {
  try {
    contactFormSchema.shape.message.parse(message);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid message";
    }
    return "Invalid message";
  }
}

// RSVP form validation schema - matches Google Sheet columns
export const rsvpFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),

  canAttend: z.enum(["Yes", "No", "Maybe"], {
    message: "Please indicate if you can attend",
  }),

  howDidYouHear: z
    .string()
    .min(1, "Please tell us how you heard about this event")
    .max(200, "Response must be less than 200 characters"),

  comments: z
    .string()
    .max(500, "Comments must be less than 500 characters")
    .optional()
    .default(""),

  subscribeToNewsletter: z.boolean().default(false),

  saveDataForNextTime: z.boolean().default(false),

  meetingDate: z.string().min(1, "Meeting date is required"),
});

export type RSVPFormData = z.infer<typeof rsvpFormSchema>;

// RSVP validation helper function
export function validateRSVPForm(
  data: unknown,
):
  | { success: true; data: RSVPFormData }
  | { success: false; errors: Record<string, string[]> } {
  try {
    const validatedData = rsvpFormSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: {
        general: ["An unexpected validation error occurred"],
      },
    };
  }
}

// RSVP field validation functions for real-time validation
export function validateFirstName(firstName: string): string | null {
  try {
    rsvpFormSchema.shape.firstName.parse(firstName);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid first name";
    }
    return "Invalid first name";
  }
}

export function validateLastName(lastName: string): string | null {
  try {
    rsvpFormSchema.shape.lastName.parse(lastName);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid last name";
    }
    return "Invalid last name";
  }
}

export function validateHowDidYouHear(response: string): string | null {
  try {
    rsvpFormSchema.shape.howDidYouHear.parse(response);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid response";
    }
    return "Invalid response";
  }
}

export function validateComments(comments: string): string | null {
  try {
    rsvpFormSchema.shape.comments.parse(comments);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || "Invalid comments";
    }
    return "Invalid comments";
  }
}
