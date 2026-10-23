import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApplicationForm } from "./ApplicationForm";

const companies = [{ id: 1, name: "Acme GmbH" }];
const countryOptions = [{ code: "de", name: "Germany" }];

describe("ApplicationForm", () => {
  it("creates an application with a company name without requiring company research first", async () => {
    const onSave = vi.fn();
    render(<ApplicationForm companies={[]} countryOptions={countryOptions} onCancel={vi.fn()} onSave={onSave} />);

    expect(screen.getByLabelText("Company name")).toBeRequired();
    expect(screen.queryByLabelText("Company")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Company name"), "New GmbH");
    await userEvent.type(screen.getByLabelText("Country"), "g");
    await userEvent.click(screen.getByRole("option", { name: "Germany" }));
    await userEvent.type(screen.getByLabelText("Job title / position applied for"), "Backend Developer");
    await userEvent.type(screen.getByLabelText("URL"), "https://example.com/jobs/1");
    await userEvent.type(screen.getByLabelText("Keywords"), "python, django, react, mysql, docker");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          company: null,
          company_name: "New GmbH",
          job_title: "Backend Developer",
        }),
      );
    }, 15000);
  }, 15000);

  it("defaults to a current vacancy and disables save until enough keywords are entered", async () => {
    render(
      <ApplicationForm
        companies={companies}
        countryOptions={countryOptions}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Company name")).toBeRequired();
    expect(screen.getByLabelText("Country")).toHaveValue("");
    expect(screen.getByLabelText("Vacancy status")).toHaveValue("current");
    expect(screen.getByText("Next step: Apply now")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Company name"), "Acme GmbH");
    await userEvent.type(screen.getByLabelText("Keywords"), "python, django, react, mysql, docker");

    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("keeps the original job details, requirements, and strategy fields in the form", () => {
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByLabelText("Company name")).toBeInTheDocument();
    expect(screen.getByLabelText("Job title / position applied for")).toBeInTheDocument();
    expect(screen.getByLabelText("Keywords")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Requirements - Other" })).toBeInTheDocument();
    expect(screen.getByLabelText("Application Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Salary")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes / Remarks")).toBeInTheDocument();
    expect(screen.getByText("No custom application fields are configured for this account.")).toBeInTheDocument();
  });

  it("offers CEFR language levels from A1 through C2", async () => {
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);
    const englishFields = within(screen.getByRole("group", { name: "English" }));

    await userEvent.selectOptions(englishFields.getAllByRole("combobox")[0], "Yes");

    expect(englishFields.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Undefined",
      "Yes",
      "No",
      "Select level",
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2",
    ]);
  });

  it("includes the expanded backend and cloud technology requirements", () => {
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByLabelText("Django REST Framework")).toBeInTheDocument();
    expect(screen.getByLabelText("Docker")).toBeInTheDocument();
    expect(screen.getByLabelText("Terraform")).toBeInTheDocument();
    expect(screen.getByLabelText("MongoDB")).toBeInTheDocument();
  });

  it("filters country suggestions by name prefix", async () => {
    const countrySuggestions = [
      { code: "ug", name: "Uganda" },
      { code: "ua", name: "Ukraine" },
      { code: "ae", name: "United Arab Emirates" },
      { code: "us", name: "United States" },
      { code: "at", name: "Austria" },
    ];
    render(<ApplicationForm companies={companies} countryOptions={countrySuggestions} onCancel={vi.fn()} onSave={vi.fn()} />);
    const countryInput = screen.getByLabelText("Country");

    expect(countryInput).toHaveValue("");
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
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);

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
        companies={companies}
        countryOptions={countryOptions}
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
    await userEvent.type(screen.getByLabelText("Company name"), "Acme GmbH");
    await userEvent.type(screen.getByLabelText("Country"), "g");
    await userEvent.click(screen.getByRole("option", { name: "Germany" }));
    await userEvent.type(screen.getByLabelText("Tech Stack"), "Kubernetes, AWS");
    await userEvent.selectOptions(screen.getByLabelText("Cloud Provider"), "AWS");
    await userEvent.click(screen.getByLabelText("Security Clearance"));

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
    }, 15000);
  }, 15000);

  it("adds a custom requirement option to the selected set", async () => {
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Add custom requirement"), "redis");
    await userEvent.click(screen.getByRole("button", { name: /add option/i }));

    expect(screen.getByText("8 selected. At least 7 required.")).toBeInTheDocument();
  });

  it("offers CEFR language levels from A1 through C2", async () => {
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={vi.fn()} />);

    const englishFieldset = screen.getByRole("group", { name: "English" });
    const englishRequirement = within(englishFieldset).getAllByRole("combobox")[0];

    await userEvent.selectOptions(englishRequirement, "Yes");

    const levels = within(englishFieldset).getAllByRole("combobox")[1];
    expect([...levels.options].map((option) => option.value)).toEqual(["", "A1", "A2", "B1", "B2", "C1", "C2"]);
  });

  it("submits normalized keywords and omits levels for language requirements set to no", async () => {
    const onSave = vi.fn();
    render(<ApplicationForm companies={companies} countryOptions={countryOptions} onCancel={vi.fn()} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText("Company name"), "Acme GmbH");
    await userEvent.type(screen.getByLabelText("Country"), "g");
    await userEvent.click(screen.getByRole("option", { name: "Germany" }));
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
          company: 1,
          company_name: "Acme GmbH",
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
