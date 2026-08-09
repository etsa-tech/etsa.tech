import {
  validateContactForm,
  getFieldError,
  emailRegex,
  sanitizeInput,
  sanitizeEmail,
  createRateLimitKey,
  validateName,
  validateEmail,
  validateSubject,
  validateMessage,
  validateRSVPForm,
  validateFirstName,
  validateLastName,
  validateHowDidYouHear,
  validateComments,
  contactFormSchema,
  rsvpFormSchema,
} from "@/lib/validation";
import { z } from "zod";

const validContact = {
  name: "Jane Doe",
  email: "Jane@Example.com",
  subject: "Hello there",
  message: "This is a long enough message.",
  "h-captcha-response": "token",
};

describe("validateContactForm", () => {
  it("accepts a valid submission and lowercases the email", () => {
    const result = validateContactForm(validContact);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("collects field errors for an invalid submission", () => {
    const result = validateContactForm({
      ...validContact,
      name: "",
      email: "bad",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
    }
  });

  it("returns a general error for non-Zod failures", () => {
    // Passing null causes z.object(...).parse to throw a ZodError too in
    // recent zod versions; simulate a truly non-Zod throw via a Proxy.
    const poisoned = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
      },
    );
    const result = validateContactForm(poisoned);
    expect(result.success).toBe(false);
  });
});

describe("getFieldError", () => {
  it("returns the first error message for a field", () => {
    expect(getFieldError({ name: ["required", "too short"] }, "name")).toBe(
      "required",
    );
  });

  it("returns undefined when there are no errors for the field", () => {
    expect(getFieldError({}, "name")).toBeUndefined();
    expect(getFieldError(undefined, "name")).toBeUndefined();
  });
});

describe("emailRegex", () => {
  it("matches valid addresses", () => {
    expect(emailRegex.test("a@b.com")).toBe(true);
  });

  it("rejects invalid addresses", () => {
    expect(emailRegex.test("not-an-email")).toBe(false);
  });
});

describe("sanitizeInput", () => {
  it("trims, collapses whitespace, and strips angle brackets", () => {
    expect(sanitizeInput("  a   <b>  c  ")).toBe("a b c");
  });
});

describe("sanitizeEmail", () => {
  it("lowercases and trims", () => {
    expect(sanitizeEmail("  Jane@Example.com  ")).toBe("jane@example.com");
  });
});

describe("createRateLimitKey", () => {
  it("builds a namespaced key", () => {
    expect(createRateLimitKey("1.2.3.4")).toBe("ratelimit:contact:1.2.3.4");
  });
});

describe("field-level validators", () => {
  it("validateName accepts a valid name and rejects an invalid one", () => {
    expect(validateName("Jane Doe")).toBeNull();
    expect(validateName("J")).toEqual(expect.any(String));
  });

  it("validateEmail accepts a valid email and rejects an invalid one", () => {
    expect(validateEmail("a@b.com")).toBeNull();
    expect(validateEmail("not-an-email")).toEqual(expect.any(String));
  });

  it("validateSubject accepts a valid subject and rejects a short one", () => {
    expect(validateSubject("Hello there")).toBeNull();
    expect(validateSubject("hi")).toEqual(expect.any(String));
  });

  it("validateMessage accepts a valid message and rejects a short one", () => {
    expect(validateMessage("This is long enough.")).toBeNull();
    expect(validateMessage("short")).toEqual(expect.any(String));
  });

  it("validateFirstName / validateLastName accept valid values and reject short ones", () => {
    expect(validateFirstName("Jane")).toBeNull();
    expect(validateFirstName("J")).toEqual(expect.any(String));
    expect(validateLastName("Doe")).toBeNull();
    expect(validateLastName("D")).toEqual(expect.any(String));
  });

  it("validateHowDidYouHear accepts a valid response and rejects an empty one", () => {
    expect(validateHowDidYouHear("Meetup")).toBeNull();
    expect(validateHowDidYouHear("")).toEqual(expect.any(String));
  });

  it("validateComments accepts short comments and rejects overly long ones", () => {
    expect(validateComments("fine")).toBeNull();
    expect(validateComments("x".repeat(501))).toEqual(expect.any(String));
  });
});

const validRsvp = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  canAttend: "Yes",
  howDidYouHear: "Meetup",
  meetingDate: "2026-01-01",
};

describe("validateRSVPForm", () => {
  it("accepts a valid submission, defaulting optional fields", () => {
    const result = validateRSVPForm(validRsvp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comments).toBe("");
      expect(result.data.subscribeToNewsletter).toBe(false);
    }
  });

  it("collects field errors for an invalid submission", () => {
    const result = validateRSVPForm({ ...validRsvp, canAttend: "Dunno" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.canAttend).toBeDefined();
    }
  });

  it("collects multiple error messages for a single field that fails several checks", () => {
    // "" fails min(1), min(2), and the letters-only regex all on the same
    // "firstName" path, exercising the errors[path]-already-exists branch.
    const result = validateRSVPForm({ ...validRsvp, firstName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.firstName.length).toBeGreaterThan(1);
    }
  });

  it("returns a general error for a non-object input", () => {
    const result = validateRSVPForm(null);
    expect(result.success).toBe(false);
  });

  it("returns a general error for a non-Zod failure", () => {
    const poisoned = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
      },
    );
    const result = validateRSVPForm(poisoned);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.general).toEqual([
        "An unexpected validation error occurred",
      ]);
    }
  });
});

describe("field validators fall back to a generic message for a non-Zod throw", () => {
  // Each validator's catch block special-cases z.ZodError; force the
  // underlying schema to throw something else to exercise the fallback.
  it.each([
    [() => validateName(""), contactFormSchema.shape.name, "Invalid name"],
    [() => validateEmail(""), contactFormSchema.shape.email, "Invalid email"],
    [
      () => validateSubject(""),
      contactFormSchema.shape.subject,
      "Invalid subject",
    ],
    [
      () => validateMessage(""),
      contactFormSchema.shape.message,
      "Invalid message",
    ],
    [
      () => validateFirstName(""),
      rsvpFormSchema.shape.firstName,
      "Invalid first name",
    ],
    [
      () => validateLastName(""),
      rsvpFormSchema.shape.lastName,
      "Invalid last name",
    ],
    [
      () => validateHowDidYouHear(""),
      rsvpFormSchema.shape.howDidYouHear,
      "Invalid response",
    ],
    [
      () => validateComments(""),
      rsvpFormSchema.shape.comments,
      "Invalid comments",
    ],
  ])("falls back for %#", (run, schema, expected) => {
    const spy = jest.spyOn(schema, "parse").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(run()).toBe(expected);
    spy.mockRestore();
  });
});

describe("field validators fall back to a generic message for a ZodError with no issues", () => {
  // error.issues[0]?.message || "Invalid X" - force a ZodError whose issues
  // array is empty so issues[0] is undefined, exercising the "||" fallback.
  it.each([
    [() => validateName(""), contactFormSchema.shape.name, "Invalid name"],
    [() => validateEmail(""), contactFormSchema.shape.email, "Invalid email"],
    [
      () => validateSubject(""),
      contactFormSchema.shape.subject,
      "Invalid subject",
    ],
    [
      () => validateMessage(""),
      contactFormSchema.shape.message,
      "Invalid message",
    ],
    [
      () => validateFirstName(""),
      rsvpFormSchema.shape.firstName,
      "Invalid first name",
    ],
    [
      () => validateLastName(""),
      rsvpFormSchema.shape.lastName,
      "Invalid last name",
    ],
    [
      () => validateHowDidYouHear(""),
      rsvpFormSchema.shape.howDidYouHear,
      "Invalid response",
    ],
    [
      () => validateComments(""),
      rsvpFormSchema.shape.comments,
      "Invalid comments",
    ],
  ])("falls back for %#", (run, schema, expected) => {
    const spy = jest.spyOn(schema, "parse").mockImplementation(() => {
      throw new z.ZodError([]);
    });
    expect(run()).toBe(expected);
    spy.mockRestore();
  });
});
