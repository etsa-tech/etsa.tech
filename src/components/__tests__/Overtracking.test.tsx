/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import Overtracking, { useOvertracking } from "@/components/Overtracking";

let lastScriptProps: Record<string, unknown> = {};
jest.mock("next/script", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastScriptProps = props;
    return (
      <script
        data-testid="overtracking-script"
        data-src={props.src as string}
      />
    );
  },
}));

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

describe("Overtracking", () => {
  it("renders nothing when disabled", () => {
    const { container } = render(<Overtracking siteId="abc" enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no site ID is provided", () => {
    const { container } = render(<Overtracking siteId={undefined} enabled />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the tracking script when enabled with a site ID", () => {
    const { getByTestId } = render(<Overtracking siteId="abc123" enabled />);
    expect(getByTestId("overtracking-script")).toHaveAttribute(
      "data-src",
      "https://cdn.overtracking.com/t/abc123/",
    );
  });

  it("logs an error via onError when the script fails to load", () => {
    render(<Overtracking siteId="abc123" enabled />);
    const onError = lastScriptProps.onError as (e: unknown) => void;
    onError(new Error("load failed"));
    expect(console.error).toHaveBeenCalledWith(
      "Overtracking: Failed to load script",
      expect.any(Error),
    );
  });

  it("onLoad callback runs without throwing", () => {
    render(<Overtracking siteId="abc123" enabled />);
    const onLoad = lastScriptProps.onLoad as () => void;
    expect(() => onLoad()).not.toThrow();
  });

  it("defaults siteId and enabled from environment variables", () => {
    process.env.NEXT_PUBLIC_OVERTRACKING_SITE_ID = "env-site";
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    const { getByTestId } = render(<Overtracking />);
    expect(getByTestId("overtracking-script")).toHaveAttribute(
      "data-src",
      "https://cdn.overtracking.com/t/env-site/",
    );
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });
  });
});

describe("useOvertracking", () => {
  function TrackerHarness() {
    const { track, identify, page } = useOvertracking();
    return (
      <div>
        <button onClick={() => track("click")}>track</button>
        <button onClick={() => identify("user1")}>identify</button>
        <button onClick={() => page("home")}>page</button>
      </div>
    );
  }

  it("logs instead of calling window.overtracking outside production", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    const { getByText } = render(<TrackerHarness />);
    getByText("track").click();
    getByText("identify").click();
    getByText("page").click();
    expect(console.log).toHaveBeenCalled();
  });

  it("logs instead of calling window.overtracking when it exists but not in production", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    window.overtracking = {
      track: jest.fn(),
      identify: jest.fn(),
      page: jest.fn(),
    };
    const { getByText } = render(<TrackerHarness />);
    getByText("track").click();
    expect(window.overtracking.track).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      "Overtracking: Event would be tracked in production",
    );
    delete window.overtracking;
  });

  it("calls window.overtracking methods in production when available", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    window.overtracking = {
      track: jest.fn(),
      identify: jest.fn(),
      page: jest.fn(),
    };
    const { getByText } = render(<TrackerHarness />);
    getByText("track").click();
    getByText("identify").click();
    getByText("page").click();
    expect(window.overtracking.track).toHaveBeenCalledWith("click", undefined);
    expect(window.overtracking.identify).toHaveBeenCalledWith(
      "user1",
      undefined,
    );
    expect(window.overtracking.page).toHaveBeenCalledWith("home", undefined);
    delete window.overtracking;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });
  });
});
