/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceForm from "@/components/admin/AttendanceForm";

const posts = [{ slug: "a", title: "Alpha Talk", date: "2025-01-01" }];

describe("AttendanceForm", () => {
  it("blocks submission without a linked post", async () => {
    const onSubmit = jest.fn();
    render(
      <AttendanceForm posts={posts} submitLabel="Add" onSubmit={onSubmit} />,
    );

    await userEvent.type(screen.getByLabelText("Event date"), "2025-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Please select a linked post."),
    ).toBeInTheDocument();
  });

  it("submits the filled-in input, auto-filling eventTitle and eventDate from the picked post", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <AttendanceForm posts={posts} submitLabel="Add" onSubmit={onSubmit} />,
    );

    await userEvent.click(
      screen.getByPlaceholderText("Search posts by title..."),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /Alpha Talk/ }),
    );

    expect(screen.getByLabelText("Event date")).toHaveValue("2025-01-01");
    await userEvent.clear(screen.getByLabelText("In-person count"));
    await userEvent.type(screen.getByLabelText("In-person count"), "10");
    await userEvent.clear(screen.getByLabelText("Virtual count"));
    await userEvent.type(screen.getByLabelText("Virtual count"), "4");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        postSlug: "a",
        eventTitle: "Alpha Talk",
        eventDate: "2025-01-01",
        format: "hybrid",
        inPersonCount: 10,
        virtualCount: 4,
      }),
    );
  });

  it("shows an error message when onSubmit rejects", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("save failed"));
    render(
      <AttendanceForm
        posts={posts}
        submitLabel="Add"
        onSubmit={onSubmit}
        initial={{
          eventDate: "2025-01-01",
          postSlug: "a",
          eventTitle: "Alpha Talk",
          format: "hybrid",
          inPersonCount: 1,
          virtualCount: 1,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("save failed")).toBeInTheDocument();
  });

  it("shows a static label instead of the picker when lockedPost is set", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <AttendanceForm
        lockedPost={{ slug: "a", title: "Alpha Talk", date: "2025-01-01" }}
        submitLabel="Add"
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.queryByPlaceholderText("Search posts by title..."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Alpha Talk")).toBeInTheDocument();
    expect(screen.getByLabelText("Event date")).toHaveValue("2025-01-01");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        postSlug: "a",
        eventTitle: "Alpha Talk",
        eventDate: "2025-01-01",
      }),
    );
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const onCancel = jest.fn();
    render(
      <AttendanceForm
        posts={posts}
        submitLabel="Add"
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
