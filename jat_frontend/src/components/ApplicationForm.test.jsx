import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApplicationForm } from "./ApplicationForm";

describe("ApplicationForm", () => {
  it("defaults to a current vacancy and disables save until enough keywords are entered", async () => {
    render(<ApplicationForm onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByLabelText("Country")).toHaveValue("Germany");
    expect(screen.getByLabelText("Vacancy status")).toHaveValue("current");
    expect(screen.getByText("Next step: Apply now")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Keywords"), "python, django, react, mysql, docker");

    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("keeps the original job details, requirements, and strategy fields in the form", () => {
    render(<ApplicationForm onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByLabelText("Job title / position applied for")).toBeInTheDocument();
    expect(screen.getByLabelText("Keywords")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Requirements - Other" })).toBeInTheDocument();
    expect(screen.getByLabelText("Application Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Salary")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes / Remarks")).toBeInTheDocument();
    expect(screen.getByText(/No custom data fields configured yet/)).toBeInTheDocument();
  });

  it("filters country suggestions by name prefix", async () => {
    const countryOptions = [
      { code: "ug", name: "Uganda" },
      { code: "ua", name: "Ukraine" },
      { code: "ae", name: "United Arab Emirates" },
      { code: "us", name: "United States" },
      { code: "at", name: "Austria" },
    ];
    render(<ApplicationForm countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);
    const countryInput = screen.getByLabelText("Country");

    await userEvent.clear(countryInput);
    await userEvent.type(countryInput, "u");

    const suggestions = within(screen.getByRole("listbox"));
    expect(suggestions.getByRole("option", { name: "Uganda" })).toBeInTheDocument();
    expect(suggestions.getByRole("option", { name: "Ukraine" })).toBeInTheDocument();
    expect(suggestions.getByRole("option", { name: "United States" })).toBeInTheDocument();
    expect(suggestions.queryByRole("option", { name: "Austria" })).not.toBeInTheDocument();
    expect(suggestions.getAllByRole("option")).toHaveLength(4);

    await userEvent.click(suggestions.getByRole("option", { name: "United States" }));
    expect(countryInput).toHaveValue("United States");
  });

  it("captures the speculative decision and hiring pattern", async () => {
    render(<ApplicationForm onCancel={vi.fn()} onSave={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText("Vacancy status"), "none");

    expect(screen.getByText("Speculative application")).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Outside-EU answer"),
      "yes_open",
    );

    expect(screen.getByLabelText("Hiring pattern")).toBeRequired();
    expect(screen.getByText("Next step: Target")).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("Hiring pattern"),
      "Q4",
    );
    expect(screen.getByLabelText("Hiring pattern")).toHaveValue("Q4");

    await userEvent.selectOptions(
      screen.getByLabelText("Outside-EU answer"),
      "maybe",
    );
    expect(screen.getByText("Next step: Re-contact later")).toBeInTheDocument();
    expect(screen.queryByLabelText("Hiring pattern")).not.toBeInTheDocument();
  });

  it("renders and submits profession-specific custom fields", async () => {
    const onSave = vi.fn();
    render(
      <ApplicationForm
        customFields={[
          { key: "tech_stack", name: "Tech Stack", field_type: "tags" },
          { key: "cloud_provider", name: "Cloud Provider", field_type: "select", options: ["AWS", "Azure"] },
          { key: "has_clearance", name: "Security Clearance", field_type: "boolean" },
        ]}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("group", { name: "Custom data / profession-specific details" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Tech Stack"), "Kubernetes, AWS");
    await userEvent.selectOptions(screen.getByLabelText("Cloud Provider"), "AWS");
    await userEvent.click(screen.getByLabelText("Security Clearance"));

    await userEvent.type(screen.getByLabelText("Company Name"), "CloudScale");
    await userEvent.type(screen.getByLabelText("Job title / position applied for"), "DevOps Engineer");
    await userEvent.type(screen.getByLabelText("URL"), "https://example.com/jobs/2");
    await userEvent.type(screen.getByLabelText("Keywords"), "kubernetes, terraform, aws, python, prometheus");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_data: {
            tech_stack: ["Kubernetes", "AWS"],
            cloud_provider: "AWS",
            has_clearance: true,
          },
        }),
      );
    });
  });

  it("adds a custom requirement option to the selected set", async () => {
    render(<ApplicationForm onCancel={vi.fn()} onSave={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Add custom requirement"), "redis");
    await userEvent.click(screen.getByRole("button", { name: /add option/i }));

    expect(screen.getByText("8 selected. At least 7 required.")).toBeInTheDocument();
  });

  it("submits normalized keywords and omits levels for language requirements set to no", async () => {
    const onSave = vi.fn();
    render(<ApplicationForm onCancel={vi.fn()} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText("Company Name"), "Acme GmbH");
    await userEvent.type(screen.getByLabelText("Job title / position applied for"), "Developer");
    await userEvent.type(screen.getByLabelText("URL"), "https://example.com/jobs/1");
    await userEvent.type(
      screen.getByLabelText("Keywords"),
      "python, django, react, mysql, docker",
    );
    await userEvent.selectOptions(
      within(screen.getByRole("group", { name: "German" })).getByRole("combobox"),
      "No",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          vacancy_status: "current",
          outside_eu_response: "",
          hiring_pattern: "",
          keywords: ["python", "django", "react", "mysql", "docker"],
          german_requirement: "No",
          german_level: "",
        }),
      );
    });
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("custom_requirement");
  });
});
