import { expect, test as base } from "@playwright/test";

import { createApplication } from "../src/test/factories.js";
import { getNextStep } from "../src/utils/applicationForm.js";

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    let customFields = [];
    let companies = [];
    let profile = {
      username: "e2e-user",
      first_name: "",
      last_name: "",
      email: "",
      location: "",
      profession_template: "",
    };
    let cv = {
      professional_summary: "",
      experience: [],
      education: [],
      skills: [],
    };
    await page.addInitScript(() => {
      localStorage.setItem("authToken", "e2e-test-token");
    });
    await page.route("**/api/auth/me/", (route) =>
      route.fulfill({
        json: { id: 1, username: "e2e-user" },
      }),
    );
    await page.route("**/api/countries/", (route) =>
      route.fulfill({
        json: [
          { code: "de", name: "Germany" },
          { code: "ug", name: "Uganda" },
          { code: "ua", name: "Ukraine" },
          { code: "us", name: "United States" },
        ],
      }),
    );
    await page.route("**/api/profile/", async (route) => {
      if (route.request().method() === "PATCH") {
        profile = { ...profile, ...route.request().postDataJSON() };
      }
      await route.fulfill({ json: profile });
    });
    await page.route("**/api/cv/", async (route) => {
      if (route.request().method() === "PATCH") {
        cv = { ...cv, ...route.request().postDataJSON() };
      }
      await route.fulfill({ json: cv });
    });
    await page.route("**/api/companies/**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ json: { results: companies } });
        return;
      }
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        const company = {
          ...payload,
          id: companies.length + 1,
          owner: 1,
          application_count: 0,
        };
        companies = [...companies, company];
        await route.fulfill({ status: 201, json: company });
        return;
      }
      if (request.method() === "PUT") {
        const id = Number(new URL(request.url()).pathname.split("/").filter(Boolean).pop());
        const payload = request.postDataJSON();
        companies = companies.map((company) => company.id === id
          ? { ...company, ...payload }
          : company);
        await route.fulfill({ json: companies.find((company) => company.id === id) });
        return;
      }
      await route.fulfill({ status: 405, json: { detail: "Method not allowed." } });
    });
    await page.route("**/api/applications/", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { results: [] } });
        return;
      }

      if (route.request().method() === "POST") {
        const submitted = route.request().postDataJSON();
        const company = companies.find((item) => item.id === submitted.company);
        if (company) company.application_count += 1;
        await route.fulfill({
          status: 201,
          json: createApplication({
            ...submitted,
            company_name: company?.name || submitted.company_name,
            company_data: company || null,
            id: 1,
            no: 1,
            approach: submitted.vacancy_status === "none" ? "Speculative" : "Apply now",
            next_step: getNextStep(
              submitted.vacancy_status,
              submitted.outside_eu_response,
            ),
          }),
        });
        return;
      }

      await route.fulfill({ status: 405, json: { detail: "Method not allowed." } });
    });
    await page.route("**/api/custom-fields/**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ json: { results: customFields } });
        return;
      }
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        const field = { ...payload, id: customFields.length + 1 };
        customFields = [...customFields, field];
        await route.fulfill({ status: 201, json: field });
        return;
      }
      if (request.method() === "DELETE") {
        const id = Number(new URL(request.url()).pathname.split("/").filter(Boolean).pop());
        customFields = customFields.filter((field) => field.id !== id);
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({ status: 405, json: { detail: "Method not allowed." } });
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Job Application Tracker" })).toBeVisible();
    await expect(page).toHaveURL(/\/applications$/);
    await use(page);
  },
});

export { expect };
