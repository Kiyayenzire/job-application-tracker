import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateAccountPage } from "./CreateAccountPage";

describe("CreateAccountPage", () => {
  it("shows a password rule error for weak passwords", async () => {
    render(<CreateAccountPage onAuthenticated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Username"), "demo");
    await userEvent.type(screen.getByLabelText("Password"), "abc123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/Password must be at least 7 characters and include uppercase, lowercase, a number, and a special character./i)).toBeInTheDocument();
  });
});
