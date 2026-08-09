/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoCarousel } from "@/components/PhotoCarousel";

const photos = [
  { src: "/a.jpg", alt: "A", caption: "First" },
  { src: "/b.jpg", alt: "B", caption: "Second" },
  { src: "/c.jpg", alt: "C", caption: "Third" },
];

describe("PhotoCarousel", () => {
  it("shows a placeholder when there are no photos", () => {
    render(<PhotoCarousel photos={[]} />);
    expect(screen.getByText("No photos available")).toBeInTheDocument();
  });

  it("renders the first photo's caption and a counter", async () => {
    render(<PhotoCarousel photos={photos} autoPlay={false} />);
    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("navigates forward and backward via arrow buttons", async () => {
    render(<PhotoCarousel photos={photos} autoPlay={false} />);
    await screen.findByLabelText("Next photo");
    await userEvent.click(screen.getByLabelText("Next photo"));
    expect(screen.getByText("Second")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Previous photo"));
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("wraps around when going previous from the first photo", async () => {
    render(<PhotoCarousel photos={photos} autoPlay={false} />);
    await screen.findByLabelText("Previous photo");
    await userEvent.click(screen.getByLabelText("Previous photo"));
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("jumps to a specific photo via a dot indicator", async () => {
    render(<PhotoCarousel photos={photos} autoPlay={false} />);
    await screen.findByLabelText("Go to photo 3");
    await userEvent.click(screen.getByLabelText("Go to photo 3"));
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("hides navigation controls for a single photo", async () => {
    render(<PhotoCarousel photos={[photos[0]]} autoPlay={false} />);
    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
  });

  it("auto-advances on an interval when autoPlay is enabled", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    render(<PhotoCarousel photos={photos} autoPlay interval={1000} />);
    expect(await screen.findByText("First")).toBeInTheDocument();
    jest.advanceTimersByTime(1000);
    expect(await screen.findByText("Second")).toBeInTheDocument();
    jest.useRealTimers();
  });
});
