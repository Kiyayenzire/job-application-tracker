import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCV, getProfile, updateCV } from "../api";
import { exportCVAsPDF, exportCVAsWord } from "../utils/cvExports";
import { CVPage } from "./CVPage";

vi.mock("../api", () => ({
  getCV: vi.fn(),
  getProfile: vi.fn(),
  updateCV: vi.fn(),
}));

vi.mock("../utils/cvExports", () => ({
  exportCVAsPDF: vi.fn(),
  exportCVAsWord: vi.fn(),
}));

describe("CVPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCV.mockResolvedValue({
      professional_summary: "",
      experience: [],
      education: [],
      skills: [],
    });
    getProfile.mockResolvedValue({
      username: "alex",
      first_name: "Alex",
      last_name: "Morgan",
      email: "alex@example.com",
      location: "Kampala, Uganda",
      profession_template: "Software / DevOps",
    });
    updateCV.mockImplementation(async (cv) => cv);
  });

  it("imports application experience and skills, then saves the CV", async () => {
    const user = userEvent.setup();
    render(
      <CVPage
        applications={[
          {
            company_name: "Legal Partners",
            job_title: "Associate Attorney",
            keywords: ["Employment law", "Legal research"],
          },
        ]}
      />,
    );

    await screen.findByLabelText("Professional summary");
    await user.click(screen.getByRole("button", { name: "Import from applications" }));

    expect(screen.getByLabelText("Experience")).toHaveValue("Associate Attorney at Legal Partners");
    expect(screen.getByLabelText("Skills")).toHaveValue("Employment law\nLegal research");
    await user.click(screen.getByRole("button", { name: "Save CV" }));

    await waitFor(() => {
      expect(updateCV).toHaveBeenCalledWith(expect.objectContaining({
        experience: ["Associate Attorney at Legal Partners"],
        skills: ["Employment law", "Legal research"],
      }));
    });
  });

  it("offers Word and PDF downloads for the current CV", async () => {
    const user = userEvent.setup();
    render(<CVPage applications={[]} />);

    await screen.findByLabelText("Professional summary");
    await user.click(screen.getByRole("button", { name: "Download Word" }));
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(exportCVAsWord).toHaveBeenCalledOnce();
    expect(exportCVAsPDF).toHaveBeenCalledOnce();
  });
});
