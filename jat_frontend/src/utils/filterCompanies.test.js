import { describe, expect, it } from "vitest";

import { filterCompanies } from "./filterCompanies";

describe("filterCompanies", () => {
  it("filters company research before any vacancy or application exists", () => {
    const companies = [
      {
        id: 1,
        name: "Entrix",
        country: "de",
        outside_eu_hiring: "unverified",
        priority: "A",
        tech_stack_match: 85,
        speculative_contact_status: "not_contacted",
        hiring_pattern: "Q4-Q1",
      },
      {
        id: 2,
        name: "Local GmbH",
        country: "de",
        outside_eu_hiring: "local_only",
        priority: "A",
        tech_stack_match: 95,
        speculative_contact_status: "not_contacted",
        hiring_pattern: "Q4-Q1",
      },
      {
        id: 3,
        name: "Other Ltd",
        country: "nl",
        outside_eu_hiring: "unverified",
        priority: "B",
        tech_stack_match: 60,
        speculative_contact_status: "not_contacted",
        hiring_pattern: "unknown",
      },
    ];

    expect(
      filterCompanies(companies, {
        country: "de",
        outsideEuHiring: "unverified",
        companyPriority: "A",
        techStackMatchMin: "75",
      }).map((company) => company.id),
    ).toEqual([1]);
  });

  it("searches evidence, stack tags, and company notes", () => {
    const companies = [{
      id: 1,
      name: "Entrix",
      outside_eu_evidence: "International offices; visa needs confirmation.",
      primary_stack_match: ["Python", "Django", "AWS"],
      company_notes: "Monitor year-end hiring.",
    }];

    expect(filterCompanies(companies, { companyResearch: "visa" })).toHaveLength(1);
    expect(filterCompanies(companies, { companyResearch: "Django" })).toHaveLength(1);
    expect(filterCompanies(companies, { companyResearch: "Kubernetes" })).toHaveLength(0);
  });
});
