"use client";

import { useState, useRef, useEffect } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  validateFirstName,
  validateLastName,
  validateEmail,
  validateHowDidYouHear,
  validateComments,
} from "@/lib/validation";
import {
  saveRSVPDataToCookies,
  loadRSVPDataFromCookies,
  clearRSVPDataFromCookies,
  areCookiesSupported,
} from "@/lib/cookies";

interface RSVPFormProps {
  className?: string;
  meetingDate: string;
  meetingTitle?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  canAttend: "Yes" | "No" | "Maybe" | "";
  howDidYouHear: string;
  comments: string;
  subscribeToNewsletter: boolean;
  saveDataForNextTime: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  canAttend?: string;
  howDidYouHear?: string;
  comments?: string;
  captcha?: string;
  general?: string;
}

export default function RSVPForm({
  className = "",
  meetingDate,
  meetingTitle = "ETSA Meetup",
}: Readonly<RSVPFormProps>) {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    canAttend: "",
    howDidYouHear: "",
    comments: "",
    subscribeToNewsletter: false,
    saveDataForNextTime: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [cookiesSupported, setCookiesSupported] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);

  // Load saved data from cookies on component mount
  useEffect(() => {
    if (areCookiesSupported()) {
      setCookiesSupported(true);
      const savedData = loadRSVPDataFromCookies();
      if (savedData) {
        setHasExistingData(true);
        setFormData((prev) => ({
          ...prev,
          firstName: savedData.firstName,
          lastName: savedData.lastName,
          email: savedData.email,
          howDidYouHear: savedData.howDidYouHear,
          saveDataForNextTime: true, // Auto-check if we loaded data
        }));
      }
    }
  }, []);

  // Helper function to get the correct value from form input
  const getInputValue = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const value = e.target.value;
    return type === "checkbox" ? checked : value;
  };

  // Helper function to clear field error
  const clearFieldError = (fieldName: string) => {
    if (errors[fieldName as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
  };

  // Helper function to set field error
  const setFieldError = (fieldName: string, error: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  // Helper function for real-time field validation
  const validateFieldRealTime = (fieldName: string, value: string) => {
    if (!value.trim()) return;

    let error: string | null = null;

    switch (fieldName) {
      case "firstName":
        error = validateFirstName(value);
        break;
      case "lastName":
        error = validateLastName(value);
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "howDidYouHear":
        error = validateHowDidYouHear(value);
        break;
      case "comments":
        error = validateComments(value);
        break;
    }

    if (error) {
      setFieldError(fieldName, error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name } = e.target;
    const value = getInputValue(e);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);

    if (typeof value === "string") {
      validateFieldRealTime(name, value);
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setErrors((prev) => ({ ...prev, captcha: undefined }));
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken("");
  };

  const handleCaptchaError = () => {
    setCaptchaToken("");
    setErrors((prev) => ({
      ...prev,
      captcha: "Captcha verification failed. Please try again.",
    }));
  };

  // Helper function to validate a required field
  const validateRequiredField = (
    value: string,
    requiredMessage: string,
    validator: (val: string) => string | null,
  ): string | null => {
    if (!value.trim()) {
      return requiredMessage;
    }
    return validator(value);
  };

  // Helper function to validate optional field
  const validateOptionalField = (
    value: string,
    validator: (val: string) => string | null,
  ): string | null => {
    return value.trim() ? validator(value) : null;
  };

  // Helper function to collect all validation errors
  const collectValidationErrors = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Required field validations
    const firstNameError = validateRequiredField(
      formData.firstName,
      "First name is required",
      validateFirstName,
    );
    if (firstNameError) newErrors.firstName = firstNameError;

    const lastNameError = validateRequiredField(
      formData.lastName,
      "Last name is required",
      validateLastName,
    );
    if (lastNameError) newErrors.lastName = lastNameError;

    const emailError = validateRequiredField(
      formData.email,
      "Email is required",
      validateEmail,
    );
    if (emailError) newErrors.email = emailError;

    const howDidYouHearError = validateRequiredField(
      formData.howDidYouHear,
      "Please tell us how you heard about this event",
      validateHowDidYouHear,
    );
    if (howDidYouHearError) newErrors.howDidYouHear = howDidYouHearError;

    // Special validations
    if (!formData.canAttend) {
      newErrors.canAttend = "Please indicate if you can attend";
    }

    if (!captchaToken) {
      newErrors.captcha = "Please complete the captcha verification";
    }

    // Optional field validation
    const commentsError = validateOptionalField(
      formData.comments,
      validateComments,
    );
    if (commentsError) newErrors.comments = commentsError;

    return newErrors;
  };

  // Helper function to scroll to first error
  const scrollToFirstError = (errorFields: string[]) => {
    const firstErrorField = errorFields[0];

    if (firstErrorField === "canAttend") {
      scrollToRadioGroup();
    } else {
      scrollToTextInput(firstErrorField);
    }
  };

  // Helper function to scroll to radio group
  const scrollToRadioGroup = () => {
    const element = document.getElementById("canAttend");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstRadio = document.getElementById("canAttend-first");
      if (firstRadio) {
        firstRadio.focus();
      }
    }
  };

  // Helper function to scroll to text input
  const scrollToTextInput = (fieldName: string) => {
    const element = document.getElementById(fieldName);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus();
    }
  };

  const validateForm = (): boolean => {
    const newErrors = collectValidationErrors();
    setErrors(newErrors);

    const errorFields = Object.keys(newErrors);
    if (errorFields.length > 0) {
      scrollToFirstError(errorFields);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      // Submit RSVP data
      const rsvpResponse = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          meetingDate,
          meetingTitle,
          captchaToken,
        }),
      });

      if (!rsvpResponse.ok) {
        throw new Error("Failed to submit RSVP");
      }

      // If user opted for mailing list, subscribe them
      if (formData.subscribeToNewsletter) {
        const mailchimpResponse = await fetch("/api/mailchimp-subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`,
          }),
        });

        if (!mailchimpResponse.ok) {
          console.warn(
            "Mailchimp subscription failed, but RSVP was successful",
          );
        }
      }

      setSubmitStatus("success");
      setSubmitMessage(
        `Thank you for your RSVP! We've confirmed your response for "${meetingTitle}".${
          formData.subscribeToNewsletter
            ? "\n\nYou've also been subscribed to our newsletter for future updates."
            : ""
        }`,
      );

      // Save data to cookies if user opted in
      if (formData.saveDataForNextTime) {
        saveRSVPDataToCookies({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          howDidYouHear: formData.howDidYouHear,
        });
      } else {
        // Clear cookies if user unchecked the option
        clearRSVPDataFromCookies();
      }

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        canAttend: "",
        howDidYouHear: "",
        comments: "",
        subscribeToNewsletter: false,
        saveDataForNextTime: false,
      });
      setErrors({});
      setCaptchaToken("");
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
    } catch (error) {
      console.error("RSVP submission error:", error);
      setSubmitStatus("error");
      setSubmitMessage(
        "Failed to submit RSVP. Please try again or contact us directly.",
      );
      setCaptchaToken("");
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Info */}
        <div className="bg-etsa-primary/10 dark:bg-etsa-primary/20 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-etsa-primary mb-2">
            RSVP for {meetingTitle}
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            Date: {meetingDate}
          </p>
        </div>

        {/* First Name Field */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.firstName
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            } text-gray-900 dark:text-gray-100`}
            placeholder="Your first name"
            disabled={isSubmitting}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.firstName}
            </p>
          )}
        </div>

        {/* Last Name Field */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.lastName
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            } text-gray-900 dark:text-gray-100`}
            placeholder="Your last name"
            disabled={isSubmitting}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.lastName}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.email
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            } text-gray-900 dark:text-gray-100`}
            placeholder="your.email@example.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.email}
            </p>
          )}
        </div>

        {/* Can You Attend Field */}
        <fieldset id="canAttend">
          <legend className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Can you attend? *
          </legend>
          <div className="space-y-2">
            {["Yes", "No", "Maybe"].map((option, index) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  id={index === 0 ? "canAttend-first" : undefined}
                  name="canAttend"
                  value={option}
                  checked={formData.canAttend === option}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-etsa-primary focus:ring-etsa-primary border-gray-300"
                  disabled={isSubmitting}
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                  {option}
                </span>
              </label>
            ))}
          </div>
          {errors.canAttend && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.canAttend}
            </p>
          )}
        </fieldset>

        {/* How Did You Hear Field */}
        <div>
          <label
            htmlFor="howDidYouHear"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            How did you hear about this event? *
          </label>
          <input
            type="text"
            id="howDidYouHear"
            name="howDidYouHear"
            value={formData.howDidYouHear}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.howDidYouHear
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            } text-gray-900 dark:text-gray-100`}
            placeholder="e.g., Meetup, LinkedIn, word of mouth, etc."
            disabled={isSubmitting}
          />
          {errors.howDidYouHear && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.howDidYouHear}
            </p>
          )}
        </div>

        {/* Comments Field */}
        <div>
          <label
            htmlFor="comments"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            Comments and/or questions
          </label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-etsa-primary focus:border-etsa-primary transition-colors ${
              errors.comments
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            } text-gray-900 dark:text-gray-100`}
            placeholder="Any questions, dietary restrictions, accessibility needs, or other comments..."
            disabled={isSubmitting}
          />
          {errors.comments && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.comments}
            </p>
          )}
        </div>

        {/* Newsletter Subscription */}
        <div>
          <div className="flex items-start">
            <input
              type="checkbox"
              id="subscribeToNewsletter"
              name="subscribeToNewsletter"
              checked={formData.subscribeToNewsletter}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-etsa-primary focus:ring-etsa-primary border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label
              htmlFor="subscribeToNewsletter"
              className="ml-3 text-sm text-gray-900 dark:text-gray-100"
            >
              Subscribe to our newsletter (We won&apos;t sell your email or spam
              you)
            </label>
          </div>
        </div>

        {/* Save Data for Next Time */}
        {cookiesSupported && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="space-y-3">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="saveDataForNextTime"
                  name="saveDataForNextTime"
                  checked={formData.saveDataForNextTime}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-etsa-primary focus:ring-etsa-primary border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="saveDataForNextTime"
                  className="ml-3 text-sm text-gray-900 dark:text-gray-100"
                >
                  Remember my information for future RSVPs (saves name, email,
                  and how you heard about us)
                </label>
              </div>

              {hasExistingData && (
                <div className="ml-7">
                  <button
                    type="button"
                    onClick={() => {
                      clearRSVPDataFromCookies();
                      setHasExistingData(false);
                      setFormData((prev) => ({
                        ...prev,
                        saveDataForNextTime: false,
                      }));
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                    disabled={isSubmitting}
                  >
                    Clear saved information
                  </button>
                </div>
              )}

              <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                Your information is stored locally in your browser and is not
                shared with third parties.
              </p>
            </div>
          </div>
        )}

        {/* Submit Status Messages */}
        {submitMessage && (
          <div
            className={`p-4 rounded-lg whitespace-pre-line ${
              submitStatus === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
            }`}
          >
            {submitMessage}
          </div>
        )}

        {/* HCaptcha */}
        <div>
          <div className="flex justify-center min-h-[78px]">
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
              onError={handleCaptchaError}
              theme="light"
              size="normal"
            />
          </div>
          {errors.captcha && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
              {errors.captcha}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-etsa-primary hover:bg-etsa-secondary text-white"
            }`}
          >
            {isSubmitting ? "Submitting RSVP..." : "Submit RSVP"}
          </button>
        </div>
      </form>
    </div>
  );
}
