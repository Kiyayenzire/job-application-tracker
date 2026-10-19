import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompanyForm } from "./CompanyForm";

describe("CompanyForm", () => {
  it("captures company-level hiring eligibility, priority, stack, and hiring cycle", () => {
    const onSave = vi.fn();
    render(
      <CompanyForm
        countryOptions={[{ code: "de", name: "Germany" }]}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Entrix" } });
    fireEvent.change(screen.getByLabelText("Outside-EU hiring"), { target: { value: "unverified" } });
    fireEvent.change(screen.getByLabelText("Tech stack match"), { target: { value: "85" } });
    fireEvent.change(screen.getByLabelText("Primary stack match"), {
      target: { value: "Python, Django, AWS" },
    });
    fireEvent.change(screen.getByLabelText("Hiring pattern"), { target: { value: "Q4-Q1" } });
    fireEvent.change(screen.getByLabelText("Next hiring window"), {
      target: { value: "Nov 2026-Feb 2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save company" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "Entrix",
      outside_eu_hiring: "unverified",
      tech_stack_match: 85,
      primary_stack_match: ["Python", "Django", "AWS"],
      hiring_pattern: "Q4-Q1",
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
  });
});
