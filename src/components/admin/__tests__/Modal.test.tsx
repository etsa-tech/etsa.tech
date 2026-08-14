/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/admin/Modal";

describe("Modal", () => {
  it("renders the title and children", () => {
    render(
      <Modal title="Edit thing" onClose={jest.fn()}>
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByText("Edit thing")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = jest.fn();
    render(
      <Modal title="Edit thing" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the overlay is clicked", async () => {
    const onClose = jest.fn();
    render(
      <Modal title="Edit thing" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape", () => {
    const onClose = jest.fn();
    render(
      <Modal title="Edit thing" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    screen
      .getByLabelText("Close modal")
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    expect(onClose).toHaveBeenCalled();
  });
});
