import { describe, expect, it } from "vitest";

import { filterApplications } from "./filterApplications";
import { createApplication } from "../test/factories";

describe("filterApplications", () => {
  it("filters by date, status, and salary range", () => {
    const applications = [
      createApplication({ id: 1, applied_on: "2026-06-01", status: "to send", salary: "50000 EUR" }),
      createApplication({ id: 2, applied_on: "2026-06-10", status: "Interviewed", salary: "80000 EUR" }),
      createApplication({ id: 3, applied_on: "2026-06-20", status: "Rejected", salary: "120000 EUR" }),
    ];

    const result = filterApplications(applications, {
      dateFrom: "2026-06-05",
      dateTo: "2026-06-15",
      status: "Interviewed",
      salaryMin: 70000,
      salaryMax: 90000,
    });

    expect(result).toEqual([applications[1]]);
  });
});
import { describe, expect, it } from "vitest";

import { filterApplications } from "./filterApplications";
import { createApplication } from "../test/factories";

describe("filterApplications", () => {
  it("filters strategy and dynamic attributes without hiding other applications", () => {
    const applications = [
      createApplication({
        vacancy_status: "none",
        application_type: "Unsolicited",
        outside_eu_response: "maybe",
        hiring_pattern: "",
        custom_data: { tech_stack: ["Kubernetes", "AWS"] },
      }),
      createApplication({
        id: 8,
        vacancy_status: "current",
        custom_data: { tech_stack: ["Java"] },
      }),
    ];

    expect(
      filterApplications(
        applications,
        { vacancyStatus: "none", applicationType: "Unsolicited", custom_tech_stack: "AWS" },
        [{ key: "tech_stack", field_type: "tags" }],
      ).map((application) => application.id),
    ).toEqual([7]);
  });

  it("filters salary ranges by overlap and excludes applications without salary data", () => {
    const applications = [
      createApplication({ id: 1, salary_min: 80000, salary_max: 95000 }),
      createApplication({ id: 2, salary_min: 40000, salary_max: 60000 }),
      createApplication({ id: 3, salary_min: null, salary_max: null, salary: "" }),
    ];

    expect(
      filterApplications(applications, { salaryMin: "85000", salaryMax: "100000" })
        .map((application) => application.id),
    ).toEqual([1]);
  });

  it("searches existing job details and requirements together", () => {
    const applications = [
      createApplication({
        id: 1,
        company_name: "CloudScale",
        job_title: "DevOps Engineer",
        keywords: ["Kubernetes", "Terraform"],
        other_requirements: ["AWS", "Linux"],
      }),
      createApplication({
        id: 2,
        company_name: "Another Company",
        job_title: "Backend Developer",
        keywords: ["Python", "Django"],
        other_requirements: ["PostgreSQL"],
      }),
    ];

    expect(
      filterApplications(applications, {
        searchText: "devops",
        requirement: "kube",
      }).map((application) => application.id),
    ).toEqual([1]);

    expect(
      filterApplications(applications, {
        searchText: "cloudscale",
        requirement: "aws",
      }).map((application) => application.id),
    ).toEqual([1]);
  });

  it("filters company and job title independently", () => {
    const applications = [
      createApplication({
        id: 1,
        company_name: "CloudScale GmbH",
        job_title: "DevOps Engineer",
      }),
      createApplication({
        id: 2,
        company_name: "CloudScale GmbH",
        job_title: "Backend Developer",
      }),
      createApplication({
        id: 3,
        company_name: "Other Company",
        job_title: "DevOps Engineer",
      }),
    ];

    expect(
      filterApplications(applications, { companyName: "cloudscale", jobTitle: "devops" })
        .map((application) => application.id),
    ).toEqual([1]);
  });
});
