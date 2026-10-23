import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApplicationTable } from "./ApplicationTable";
import { createApplication } from "../test/factories";

describe("ApplicationTable", () => {
  it("shows vacancy availability and the next recommended step", () => {
    render(
      <ApplicationTable
        applications={[
          createApplication({
            vacancy_status: "none",
            outside_eu_response: "yes_open",
            hiring_pattern: "Q1",
            approach: "Speculative",
            next_step: "Target",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Vacancy" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Outside-EU answer" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Hiring pattern" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Approach" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Job title / position applied for" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Job requirements - Other" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Speculative" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Target" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Q1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Full Stack Developer" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /python, Django, react/ })).toBeInTheDocument();
  });

  it("shows the empty application state when there are no records", () => {
    render(<ApplicationTable applications={[]} />);

    expect(screen.getByText("No applications yet.")).toBeInTheDocument();
  });

  it("renders custom fields as application columns", () => {
    render(
      <ApplicationTable
        applications={[
          createApplication({
            country: "ua",
            custom_data: {
              tech_stack: ["Kubernetes", "AWS"],
              clearance: false,
            },
          }),
        ]}
        countryOptions={[{ code: "ua", name: "Ukraine" }]}
        customFields={[
          { key: "tech_stack", name: "Tech Stack", field_type: "tags" },
          { key: "clearance", name: "Security Clearance", field_type: "boolean" },
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Tech Stack" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ukraine" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Kubernetes, AWS" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "No" })).toHaveLength(2);
  });

  it("renders the action buttons and blocks deletion for terminal statuses", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ApplicationTable
        applications={[createApplication({ status: "Interviewed" })]}
        onDelete={onDelete}
        onEdit={onEdit}
      />,
    );

    const editButton = screen.getByRole("button", { name: /edit/i });
    const deleteButton = screen.getByRole("button", { name: /delete/i });

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();

    await userEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });
});
