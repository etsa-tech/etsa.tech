"use client";

import { useState } from "react";

// Form status type
export type FormStatus = "idle" | "success" | "error";

// Generic form state management
export interface BaseFormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  submitStatus: FormStatus;
  submitMessage: string;
  captchaToken: string;
}

// Generic form actions
export interface FormActions<T> {
  setData: (data: T | ((prev: T) => T)) => void;
  setErrors: (
    errors:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  setFieldError: (field: string, error: string | undefined) => void;
  clearFieldError: (field: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setSubmitStatus: (status: FormStatus) => void;
  setSubmitMessage: (message: string) => void;
  setCaptchaToken: (token: string) => void;
  resetForm: (initialData: T) => void;
}

// Custom hook for form state management
export function useFormState<T>(
  initialData: T,
): [BaseFormState<T>, FormActions<T>] {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<FormStatus>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const actions: FormActions<T> = {
    setData,
    setErrors,
    setFieldError: (field: string, error: string | undefined) => {
      setErrors((prev) => ({
        ...prev,
        [field]: error || "",
      }));
    },
    clearFieldError: (field: string) => {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    },
    setIsSubmitting,
    setSubmitStatus,
    setSubmitMessage,
    setCaptchaToken,
    resetForm: (resetData: T) => {
      setData(resetData);
      setErrors({});
      setIsSubmitting(false);
      setSubmitStatus("idle");
      setSubmitMessage("");
      setCaptchaToken("");
    },
  };

  const state: BaseFormState<T> = {
    data,
    errors,
    isSubmitting,
    submitStatus,
    submitMessage,
    captchaToken,
  };

  return [state, actions];
}

// Generic input change handler
export function createInputChangeHandler<T>(
  setData: (data: T | ((prev: T) => T)) => void,
  clearFieldError: (field: string) => void,
  validateField?: (field: string, value: string) => string | null,
  setFieldError?: (field: string, error: string | undefined) => void,
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const fieldValue = type === "checkbox" ? checked : value;

    setData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    clearFieldError(name);

    // Real-time validation if provided
    if (
      validateField &&
      setFieldError &&
      typeof fieldValue === "string" &&
      fieldValue.trim()
    ) {
      const error = validateField(name, fieldValue);
      if (error) {
        setFieldError(name, error);
      }
    }
  };
}

// Type for field validators
export type FieldValidator = (value: unknown) => string | null;

// Generic form validation
export function validateFormFields<T extends Record<string, unknown>>(
  data: T,
  validators: Record<string, FieldValidator>,
  requiredFields: string[] = [],
): Record<string, string> {
  const errors: Record<string, string> = {};

  // Check required fields
  for (const field of requiredFields) {
    const value = data[field];
    if (!value || (typeof value === "string" && !value.trim())) {
      errors[field] = `${
        field.charAt(0).toUpperCase() + field.slice(1)
      } is required`;
      continue;
    }

    // Run field-specific validation
    if (validators[field]) {
      const error = validators[field](value);
      if (error) {
        errors[field] = error;
      }
    }
  }

  // Validate optional fields that have values
  for (const [field, validator] of Object.entries(validators)) {
    if (requiredFields.includes(field)) continue; // Already validated above

    const value = data[field];
    if (value && typeof value === "string" && value.trim()) {
      const error = validator(value);
      if (error) {
        errors[field] = error;
      }
    }
  }

  return errors;
}

// Generic form submission handler
export async function submitForm<T>(
  endpoint: string,
  data: T,
  captchaToken: string,
  additionalData?: Record<string, unknown>,
): Promise<Response> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...data,
      ...additionalData,
      "h-captcha-response": captchaToken,
      captchaToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to submit form");
  }

  return response;
}

// Scroll to first error field
export function scrollToFirstError(
  errors: Record<string, string>,
  specialFields: Record<string, string> = {},
) {
  const errorFields = Object.keys(errors);
  if (errorFields.length === 0) return;

  const firstErrorField = errorFields[0];

  // Handle special fields (like radio groups)
  if (specialFields[firstErrorField]) {
    const element = document.getElementById(specialFields[firstErrorField]);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusElement = document.getElementById(`${firstErrorField}-first`);
      if (focusElement) {
        focusElement.focus();
      }
    }
    return;
  }

  // Handle regular fields
  const element = document.getElementById(firstErrorField);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus();
  }
}

// HCaptcha handlers
export function createCaptchaHandlers(
  setCaptchaToken: (token: string) => void,
  setFieldError: (field: string, error: string | undefined) => void,
  clearFieldError: (field: string) => void,
) {
  return {
    onVerify: (token: string) => {
      setCaptchaToken(token);
      clearFieldError("captcha");
    },
    onExpire: () => {
      setCaptchaToken("");
    },
    onError: () => {
      setCaptchaToken("");
      setFieldError(
        "captcha",
        "Captcha verification failed. Please try again.",
      );
    },
  };
}
