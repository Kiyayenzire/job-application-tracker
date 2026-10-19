import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterSidebar } from "./FilterSidebar";

describe("FilterSidebar", () => {
  it("provides separate company, country, and job title filters without applying while editing", () => {
    const onChange = vi.fn();
    const onApply = vi.fn();
    render(
      <FilterSidebar
        activeFilterCount={0}
        countryOptions={[
          { code: "de", name: "Germany" },
          { code: "us", name: "United States" },
        ]}
        customFields={[]}
        filters={{}}
        onApply={onApply}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "CloudScale" } });
    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "DevOps" } });

    expect(onChange).toHaveBeenNthCalledWith(1, "companyName", "CloudScale");
    expect(onChange).toHaveBeenNthCalledWith(2, "jobTitle", "DevOps");
    expect(screen.getByLabelText("Country filter")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it("shows and clears the active filter count", () => {
    const onClear = vi.fn();
    render(
      <FilterSidebar
        activeFilterCount={3}
        countryOptions={[]}
        customFields={[]}
        filters={{}}
        onApply={vi.fn()}
        onChange={vi.fn()}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("3 active")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
