import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompanyTable } from "./CompanyTable";

describe("CompanyTable", () => {
  it("shows company-level research separately from vacancies", () => {
    render(
      <CompanyTable
        companies={[{
          id: 1,
          name: "Entrix",
          country: "de",
          outside_eu_hiring_label: "Unverified",
          priority: "A",
          tech_stack_match: 85,
          hiring_pattern_label: "Q4-Q1",
          application_count: 2,
        }]}
        countryOptions={[{ code: "de", name: "Germany" }]}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByRole("cell", { name: "Entrix" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Germany" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Unverified" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "85/100" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("opens the selected company for editing", () => {
    const onEdit = vi.fn();
    const company = {
      id: 2,
      name: "Entrix",
      country: "de",
    };
    render(<CompanyTable companies={[company]} countryOptions={[]} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Entrix" }));

    expect(onEdit).toHaveBeenCalledWith(company);
  });
});
