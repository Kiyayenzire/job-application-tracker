import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CompanyForm } from "./CompanyForm";

describe("CompanyForm", () => {
  it("captures company-level hiring eligibility, priority, stack, and hiring cycle", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <CompanyForm
        countryOptions={[
          { code: "de", name: "Germany" },
          { code: "ug", name: "Uganda" },
        ]}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Entrix" } });
    await user.type(screen.getByLabelText("Country"), "u");
    await user.click(screen.getByRole("option", { name: "Uganda" }));
    fireEvent.change(screen.getByLabelText("Outside-EU hiring"), { target: { value: "unverified" } });
    fireEvent.change(screen.getByLabelText("Tech stack match"), { target: { value: "85" } });
    fireEvent.change(screen.getByLabelText("Primary stack match"), {
      target: { value: "Python, Django, AWS" },
    });
    expect(screen.getByLabelText("Primary stack match")).toHaveClass("tech-stack-input");
    fireEvent.change(screen.getByLabelText("Hiring pattern"), { target: { value: "Q4-Q1" } });
    fireEvent.change(screen.getByLabelText("German level"), { target: { value: "B1" } });
    fireEvent.change(screen.getByLabelText("English level"), { target: { value: "C2" } });
    fireEvent.change(screen.getByLabelText("Next hiring window"), {
      target: { value: "Nov 2026-Feb 2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save company" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "Entrix",
      country: "ug",
      outside_eu_hiring: "unverified",
      tech_stack_match: 85,
      primary_stack_match: ["Python", "Django", "AWS"],
      hiring_pattern: "Q4-Q1",
      german_level: "B1",
      english_level: "C2",
      next_hiring_window: "Nov 2026-Feb 2027",
    }));
  });

  it("preserves company research while editing", () => {
    render(
      <CompanyForm
        company={{
          id: 4,
          name: "Entrix",
          country: "de",
          outside_eu_hiring: "likely",
          tech_stack_match: 85,
          primary_stack_match: ["Python", "AWS"],
          german_level: "B2",
          english_level: "C1",
        }}
        countryOptions={[{ code: "de", name: "Germany" }]}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Company name")).toHaveValue("Entrix");
    expect(screen.getByLabelText("Outside-EU hiring")).toHaveValue("likely");
    expect(screen.getByLabelText("Tech stack match")).toHaveValue(85);
    expect(screen.getByLabelText("Primary stack match")).toHaveValue("Python, AWS");
    expect(screen.getByLabelText("German level")).toHaveValue("B2");
    expect(screen.getByLabelText("English level")).toHaveValue("C1");
  });

  it("starts without a country restriction and offers countries from the first typed letter", async () => {
    const user = userEvent.setup();
    render(
      <CompanyForm
        countryOptions={[
          { code: "de", name: "Germany" },
          { code: "ug", name: "Uganda" },
          { code: "us", name: "United States" },
        ]}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const countryInput = screen.getByLabelText("Country");
    expect(countryInput).toHaveValue("");
    await user.type(countryInput, "u");

    expect(screen.getByRole("option", { name: "Uganda" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "United States" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Germany" })).not.toBeInTheDocument();
  });

  it("renders and saves company-specific custom fields", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <CompanyForm
        company={{
          id: 4,
          name: "Legal Partners",
          custom_data: { practice_area: "Employment law" },
        }}
        countryOptions={[{ code: "de", name: "Germany" }]}
        customFields={[
          {
            id: 7,
            key: "practice_area",
            name: "Practice Area",
            field_type: "text",
            options: [],
          },
          {
            id: 8,
            key: "years_experience",
            name: "Years of Experience",
            field_type: "number",
            options: [],
          },
        ]}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByLabelText("Practice Area")).toHaveValue("Employment law");
    await user.type(screen.getByLabelText("Country"), "g");
    await user.click(screen.getByRole("option", { name: "Germany" }));
    await user.clear(screen.getByLabelText("Practice Area"));
    await user.type(screen.getByLabelText("Practice Area"), "Immigration");
    await user.type(screen.getByLabelText("Years of Experience"), "0");
    await user.click(screen.getByRole("button", { name: "Save company" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_data: { practice_area: "Immigration", years_experience: 0 },
      }),
    );
  });
});
