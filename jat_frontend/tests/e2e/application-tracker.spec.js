import { expect, test } from "../fixtures.js";

test("creates an application from the authenticated tracker", async ({ authenticatedPage: page }) => {
  await expect(page.getByRole("heading", { name: "Job Applications" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GERMANY" })).toHaveCount(0);
  await expect(page.getByText("No applications yet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tracked applications" })).toBeVisible();
  const filters = page.getByRole("complementary", { name: "Application filters" });
  await expect(filters.getByRole("heading", { name: "Filter applications" })).toBeVisible();
  await expect(filters.getByRole("textbox", { name: "Company" })).toBeVisible();
  await expect(filters.getByLabel("Job title")).toBeVisible();
  await expect(page.getByLabel("Job requirements")).toBeVisible();
  await expect(page.getByText("No custom filters yet. Add a searchable custom field to show it here.")).toBeVisible();
  await page.getByRole("button", { name: "Add custom fields" }).click();
  await expect(page.getByRole("heading", { name: "Custom data and tracking settings" })).toBeVisible();
  await page.getByRole("button", { name: "Hide custom data settings" }).click();

  const countryFilter = filters.getByRole("combobox", { name: "Country filter" });
  await countryFilter.fill("u");
  await expect(page.getByRole("option", { name: "Ukraine" })).toBeVisible();
  await expect(page.getByRole("option", { name: "United States" })).toBeVisible();
  await page.getByRole("button", { name: "All countries" }).click();

  await page.getByRole("button", { name: "Add new application" }).click();
  const form = page.getByRole("form", { name: "Application details" });
  await expect(form.getByLabel("Country")).toBeVisible();
  await form.getByLabel("Country").fill("u");
  await form.getByRole("option", { name: "Ukraine" }).click();
  await form.getByLabel("Company Name").fill("Acme GmbH");
  await form.getByLabel("Job title / position applied for").fill("Full Stack Developer");
  await form.getByLabel("URL").fill("https://example.com/jobs/1");
  await form.getByLabel("Keywords").fill("python, django, react, mysql, docker");
  await expect(page.getByText("Next step: Apply now")).toBeVisible();
  await form.getByLabel("Vacancy status").selectOption("none");
  await form.getByLabel("Outside-EU answer").selectOption("yes_open");
  await form.getByLabel("Hiring pattern").selectOption("Q4");
  await form.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("cell", { name: "Acme GmbH" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Full Stack Developer" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Speculative" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Target" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Q4" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ukraine" })).toBeVisible();

  await filters.getByLabel("Job title").fill("Full Stack");
  await filters.getByLabel("Job requirements").fill("docker");
  await expect(page.getByRole("cell", { name: "Acme GmbH" })).toBeVisible();
  await filters.getByLabel("Job requirements").fill("Kubernetes");
  await expect(page.getByRole("cell", { name: "Acme GmbH" })).toBeVisible();
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No applications match these filters.")).toBeVisible();
  await filters.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("cell", { name: "Acme GmbH" })).toBeVisible();
});

test("configures profession fields, saves values, and filters by a custom tag", async ({ authenticatedPage: page }) => {
  await page.getByRole("button", { name: "Custom data & profile settings" }).click();
  await page.getByLabel("Profession template").fill("Software / DevOps");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByLabel("Field name").fill("Tech Stack");
  await page.getByRole("button", { name: "Add custom field", exact: true }).click();
  await page.getByRole("button", { name: "Hide custom data settings" }).click();

  await page.getByRole("button", { name: "Add new application" }).click();
  const form = page.getByRole("form", { name: "Application details" });
  await form.getByLabel("Company Name").fill("CloudScale Berlin GmbH");
  await form.getByLabel("Job title / position applied for").fill("DevOps Engineer");
  await form.getByLabel("URL").fill("https://example.com/jobs/devops");
  await form.getByLabel("Keywords").fill("python, django, react, mysql, docker");
  await form.getByLabel("Tech Stack").fill("Kubernetes, AWS");
  await form.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("cell", { name: "Kubernetes, AWS" })).toBeVisible();
  const filters = page.getByRole("complementary", { name: "Application filters" });
  await filters.getByLabel("Tech Stack").fill("AWS");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("cell", { name: "CloudScale Berlin GmbH" })).toBeVisible();
  await filters.getByLabel("Tech Stack").fill("Terraform");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No applications match these filters.")).toBeVisible();
});

test("opens the filter menu on narrow screens", async ({ authenticatedPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const filters = page.getByRole("complementary", { name: "Application filters" });
  await expect(filters).toBeHidden();
  await page.getByRole("button", { name: "Filter applications" }).click();
  await expect(filters).toBeVisible();
  await expect(filters.getByLabel("Country filter")).toBeVisible();
});
