import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProfile, updateProfile } from "../api";
import { ProfilePage } from "./ProfilePage";

vi.mock("../api", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue({
      username: "alex",
      first_name: "Alex",
      last_name: "Morgan",
      email: "alex@example.com",
      location: "Kampala, Uganda",
      profession_template: "Software / DevOps",
    });
  });

  it("loads and saves personal details and profession", async () => {
    const user = userEvent.setup();
    updateProfile.mockImplementation(async (profile) => profile);
    render(<ProfilePage username="alex" />);

    expect(await screen.findByLabelText("First name")).toHaveValue("Alex");
    expect(screen.getByLabelText("Last name")).toHaveValue("Morgan");
    expect(screen.getByLabelText("Email")).toHaveValue("alex@example.com");
    expect(screen.getByLabelText("Location")).toHaveValue("Kampala, Uganda");
    expect(screen.getByLabelText("Profession")).toHaveValue("Software / DevOps");

    await user.clear(screen.getByLabelText("Location"));
    await user.type(screen.getByLabelText("Location"), "Entebbe, Uganda");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
        location: "Entebbe, Uganda",
        profession_template: "Software / DevOps",
      }));
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Profile saved.");
  });
});
