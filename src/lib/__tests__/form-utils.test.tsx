/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import {
  useFormState,
  createInputChangeHandler,
  validateFormFields,
  submitForm,
  scrollToFirstError,
  createCaptchaHandlers,
} from "@/lib/form-utils";

describe("useFormState", () => {
  it("initializes with the given data and idle status", () => {
    const { result } = renderHook(() => useFormState({ name: "" }));
    const [state] = result.current;
    expect(state.data).toEqual({ name: "" });
    expect(state.submitStatus).toBe("idle");
    expect(state.isSubmitting).toBe(false);
  });

  it("setFieldError sets and clearFieldError removes a field error", () => {
    const { result } = renderHook(() => useFormState({ name: "" }));
    act(() => result.current[1].setFieldError("name", "required"));
    expect(result.current[0].errors.name).toBe("required");
    act(() => result.current[1].clearFieldError("name"));
    expect(result.current[0].errors.name).toBeUndefined();
  });

  it("setFieldError falls back to an empty string when error is undefined", () => {
    const { result } = renderHook(() => useFormState({ name: "" }));
    act(() => result.current[1].setFieldError("name", undefined));
    expect(result.current[0].errors.name).toBe("");
  });

  it("resetForm restores idle state and the given data", () => {
    const { result } = renderHook(() => useFormState({ name: "" }));
    act(() => {
      result.current[1].setIsSubmitting(true);
      result.current[1].setSubmitStatus("success");
      result.current[1].setSubmitMessage("done");
      result.current[1].setCaptchaToken("tok");
    });
    act(() => result.current[1].resetForm({ name: "reset" }));
    const [state] = result.current;
    expect(state).toEqual({
      data: { name: "reset" },
      errors: {},
      isSubmitting: false,
      submitStatus: "idle",
      submitMessage: "",
      captchaToken: "",
    });
  });
});

describe("createInputChangeHandler", () => {
  function target(overrides: Partial<HTMLInputElement>) {
    return {
      name: "field",
      value: "",
      type: "text",
      checked: false,
      ...overrides,
    };
  }

  it("updates data with the field's string value", () => {
    const setData = jest.fn();
    const clearFieldError = jest.fn();
    const handler = createInputChangeHandler(setData, clearFieldError);
    handler({ target: target({ value: "hello" }) } as never);

    const updater = setData.mock.calls[0][0] as (p: object) => object;
    expect(updater({})).toEqual({ field: "hello" });
    expect(clearFieldError).toHaveBeenCalledWith("field");
  });

  it("uses the checked boolean for checkbox inputs", () => {
    const setData = jest.fn();
    const handler = createInputChangeHandler(setData, jest.fn());
    handler({
      target: target({ type: "checkbox", checked: true }),
    } as never);
    const updater = setData.mock.calls[0][0] as (p: object) => object;
    expect(updater({})).toEqual({ field: true });
  });

  it("runs field validation and reports an error when validateField returns one", () => {
    const setData = jest.fn();
    const setFieldError = jest.fn();
    const validateField = jest.fn().mockReturnValue("bad value");
    const handler = createInputChangeHandler(
      setData,
      jest.fn(),
      validateField,
      setFieldError,
    );
    handler({ target: target({ value: "x" }) } as never);
    expect(setFieldError).toHaveBeenCalledWith("field", "bad value");
  });

  it("does not call setFieldError when validation passes", () => {
    const setFieldError = jest.fn();
    const handler = createInputChangeHandler(
      jest.fn(),
      jest.fn(),
      () => null,
      setFieldError,
    );
    handler({ target: target({ value: "x" }) } as never);
    expect(setFieldError).not.toHaveBeenCalled();
  });

  it("skips validation for an empty value", () => {
    const validateField = jest.fn();
    const handler = createInputChangeHandler(
      jest.fn(),
      jest.fn(),
      validateField,
      jest.fn(),
    );
    handler({ target: target({ value: "   " }) } as never);
    expect(validateField).not.toHaveBeenCalled();
  });
});

describe("validateFormFields", () => {
  it("flags missing required fields", () => {
    const errors = validateFormFields({ name: "" }, {}, ["name"]);
    expect(errors.name).toBe("Name is required");
  });

  it("runs a validator on a present required field", () => {
    const errors = validateFormFields(
      { name: "x" },
      { name: () => "too short" },
      ["name"],
    );
    expect(errors.name).toBe("too short");
  });

  it("validates optional fields that have a value", () => {
    const errors = validateFormFields(
      { name: "ok", nickname: "bad" },
      { nickname: () => "invalid nickname" },
      ["name"],
    );
    expect(errors.nickname).toBe("invalid nickname");
  });

  it("ignores optional fields with no value", () => {
    const errors = validateFormFields(
      { name: "ok", nickname: "" },
      { nickname: () => "invalid nickname" },
      ["name"],
    );
    expect(errors.nickname).toBeUndefined();
  });

  it("defaults requiredFields to an empty list when omitted", () => {
    const errors = validateFormFields({ name: "" }, {});
    expect(errors).toEqual({});
  });

  it("does not add an error when a required field's validator passes", () => {
    const errors = validateFormFields({ name: "x" }, { name: () => null }, [
      "name",
    ]);
    expect(errors.name).toBeUndefined();
  });

  it("does not add an error when an optional field's validator passes", () => {
    const errors = validateFormFields(
      { name: "ok", nickname: "good" },
      { nickname: () => null },
      ["name"],
    );
    expect(errors.nickname).toBeUndefined();
  });
});

describe("submitForm", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts merged data, additionalData, and the captcha token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await submitForm("/api/contact", { name: "Jane" }, "captcha-tok", {
      extra: 1,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      name: "Jane",
      extra: 1,
      "h-captcha-response": "captcha-tok",
      captchaToken: "captcha-tok",
    });
  });

  it("throws the server-provided error message on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Rate limited" }),
    }) as unknown as typeof fetch;
    await expect(submitForm("/api/contact", {}, "tok")).rejects.toThrow(
      "Rate limited",
    );
  });

  it("falls back to a generic error when the error body can't be parsed", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;
    await expect(submitForm("/api/contact", {}, "tok")).rejects.toThrow(
      "Failed to submit form",
    );
  });
});

describe("scrollToFirstError", () => {
  it("does nothing when there are no errors", () => {
    expect(() => scrollToFirstError({})).not.toThrow();
  });

  it("scrolls and focuses a regular field element", () => {
    const el = document.createElement("input");
    el.id = "name";
    el.scrollIntoView = jest.fn();
    el.focus = jest.fn();
    document.body.appendChild(el);

    scrollToFirstError({ name: "required" });
    expect(el.scrollIntoView).toHaveBeenCalled();
    expect(el.focus).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("does nothing when the regular field element is missing", () => {
    expect(() => scrollToFirstError({ missing: "required" })).not.toThrow();
  });

  it("scrolls a special field's container and focuses its -first element", () => {
    const container = document.createElement("div");
    container.id = "attendance-group";
    container.scrollIntoView = jest.fn();
    const first = document.createElement("input");
    first.id = "canAttend-first";
    first.focus = jest.fn();
    document.body.append(container, first);

    scrollToFirstError(
      { canAttend: "required" },
      { canAttend: "attendance-group" },
    );
    expect(container.scrollIntoView).toHaveBeenCalled();
    expect(first.focus).toHaveBeenCalled();
    document.body.removeChild(container);
    document.body.removeChild(first);
  });

  it("does nothing when the special field's container is missing", () => {
    expect(() =>
      scrollToFirstError({ canAttend: "required" }, { canAttend: "missing" }),
    ).not.toThrow();
  });

  it("scrolls a special field's container but does not throw when its -first element is missing", () => {
    const container = document.createElement("div");
    container.id = "attendance-group";
    container.scrollIntoView = jest.fn();
    document.body.appendChild(container);

    expect(() =>
      scrollToFirstError(
        { canAttend: "required" },
        { canAttend: "attendance-group" },
      ),
    ).not.toThrow();
    expect(container.scrollIntoView).toHaveBeenCalled();
    document.body.removeChild(container);
  });
});

describe("createCaptchaHandlers", () => {
  it("onVerify sets the token and clears the captcha error", () => {
    const setCaptchaToken = jest.fn();
    const clearFieldError = jest.fn();
    const handlers = createCaptchaHandlers(
      setCaptchaToken,
      jest.fn(),
      clearFieldError,
    );
    handlers.onVerify("tok");
    expect(setCaptchaToken).toHaveBeenCalledWith("tok");
    expect(clearFieldError).toHaveBeenCalledWith("captcha");
  });

  it("onExpire clears the token", () => {
    const setCaptchaToken = jest.fn();
    const handlers = createCaptchaHandlers(
      setCaptchaToken,
      jest.fn(),
      jest.fn(),
    );
    handlers.onExpire();
    expect(setCaptchaToken).toHaveBeenCalledWith("");
  });

  it("onError clears the token and sets a captcha field error", () => {
    const setCaptchaToken = jest.fn();
    const setFieldError = jest.fn();
    const handlers = createCaptchaHandlers(
      setCaptchaToken,
      setFieldError,
      jest.fn(),
    );
    handlers.onError();
    expect(setCaptchaToken).toHaveBeenCalledWith("");
    expect(setFieldError).toHaveBeenCalledWith(
      "captcha",
      expect.stringMatching(/verification failed/i),
    );
  });
});
