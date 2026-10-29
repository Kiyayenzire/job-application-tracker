import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const assessmentApi = vi.hoisted(() => ({
  getApplicationAssessment: vi.fn(),
  saveApplicationAssessment: vi.fn(),
}));

vi.mock("../api", () => assessmentApi);

import { AssessmentPage } from "./AssessmentPage";

const applications = [
  { id: 11, company_name: "Entrix", job_title: "Software Engineer" },
  { id: 12, company_name: "Entrix", job_title: "Platform Engineer" },
];

function assessmentFor(applicationId) {
  return {
    id: null,
    application: applicationId,
    status: "not_started",
    essential_scores: {},
    nice_to_have_scores: {},
    essential_score: null,
    nice_to_have_score: null,
    evidence_notes: "",
    outstanding_questions: "",
    red_flags_concerns: "",
    career_growth_outlook: "unknown",
    relocation_feasibility: "unclear",
    final_assessment: "further_investigation",
    last_assessed_date: null,
  };
}

describe("AssessmentPage", () => {
  it("prompts the user to add an application when none exist", () => {
    render(<AssessmentPage applications={[]} />);

    expect(screen.getByText(/add a job application before creating/i)).toBeInTheDocument();
  });

  it("loads and saves per-application assessments with partial score averages", async () => {
    const user = userEvent.setup();
    assessmentApi.getApplicationAssessment.mockImplementation(async (id) => assessmentFor(Number(id)));
    assessmentApi.saveApplicationAssessment.mockImplementation(async (id, payload) => ({
      ...payload,
      id: 21,
      application: Number(id),
      essential_score: 4,
      nice_to_have_score: 4,
    }));

    render(<AssessmentPage applications={applications} />);

    expect(await screen.findAllByText("Not scored")).toHaveLength(2);
    await user.selectOptions(
      screen.getByLabelText("Career Growth & Progression score"),
      "5",
    );
    await user.selectOptions(
      screen.getByLabelText("Ownership & Autonomy score"),
      "3",
    );
    await user.selectOptions(screen.getByLabelText("Assessment Status"), "completed");
    await user.type(
      screen.getByLabelText("Evidence & Notes"),
      "Discussed progression criteria.",
    );

    expect(screen.getByText("4.00 / 5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save assessment" }));

    await waitFor(() => {
      expect(assessmentApi.saveApplicationAssessment).toHaveBeenCalledWith(
        "11",
        expect.objectContaining({
          status: "completed",
          essential_scores: expect.objectContaining({
            career_growth: 5,
            ownership: 3,
          }),
          evidence_notes: "Discussed progression criteria.",
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Assessment saved.");

    await user.selectOptions(screen.getByLabelText("Application"), "12");
    await waitFor(() => {
      expect(assessmentApi.getApplicationAssessment).toHaveBeenCalledWith("12");
    });
  }, 15000);
});
