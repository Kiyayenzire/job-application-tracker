import { expect, test as base } from "@playwright/test";

import { createApplication } from "../src/test/factories.js";
import { getNextStep } from "../src/utils/applicationForm.js";

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    let customFields = [];
    let profile = { profession_template: "" };
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
    await page.route("**/api/applications/", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { results: [] } });
        return;
      }

      if (route.request().method() === "POST") {
        const submitted = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          json: createApplication({
            ...submitted,
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
        const field = {
          ...payload,
          id: customFields.length + 1,
          key: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
        };
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
    await page.route("**/api/profile/", async (route) => {
      if (route.request().method() === "PATCH") {
        profile = { ...profile, ...route.request().postDataJSON() };
      }
      await route.fulfill({ json: profile });
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Job Applications" })).toBeVisible();
    await use(page);
  },
});

export { expect };
