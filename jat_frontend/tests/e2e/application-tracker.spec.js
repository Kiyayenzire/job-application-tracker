import { expect, test } from "../fixtures.js";

test("creates an application from the authenticated tracker", async ({ authenticatedPage: page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await expect(page.getByRole("heading", { name: "Job Applications" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GERMANY" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Company research" })).toBeVisible();
  await expect(page.getByText(/Add a company before recording/)).toBeVisible();
  const filters = page.getByRole("complementary", { name: "Application filters" });
  await expect(filters.getByRole("heading", { name: "Filter companies & applications" })).toBeVisible();
  await expect(filters.getByRole("textbox", { name: "Company", exact: true })).toBeVisible();
  await expect(filters.getByLabel("Job title")).toBeVisible();
  await expect(page.getByLabel("Job requirements")).toBeVisible();
  await expect(page.getByText("No custom filters yet. Add a searchable custom field to show it here.")).toBeVisible();
  await page.getByRole("button", { name: "Add custom fields" }).click();
  await expect(page.getByRole("heading", { name: "Custom data and tracking settings" })).toBeVisible();
  await page.getByRole("button", { name: "Hide custom data settings" }).click();

  await page.getByRole("button", { name: "Add company" }).click();
  expect(pageErrors, JSON.stringify(pageErrors)).toEqual([]);
  const companyForm = page.getByRole("form", { name: "Company research" });
  await expect(companyForm).toBeVisible();
  await page.getByLabel("Company name").fill("Acme GmbH");
  await companyForm.getByLabel("Outside-EU hiring").selectOption("likely");
  await companyForm.getByLabel("Outside-EU evidence").fill("Careers page mentions international hiring.");
  await companyForm.getByLabel("Tech stack match").fill("85");
  await companyForm.getByLabel("Company priority").selectOption("A");
  await companyForm.getByRole("button", { name: "Save company" }).click();
  const companyTable = page.getByRole("region", { name: "Companies table" });
  await expect(companyTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await companyTable.getByRole("button", { name: "Edit Acme GmbH" }).click();
  await expect(companyForm.getByLabel("Outside-EU evidence")).toHaveValue(
    "Careers page mentions international hiring.",
  );
  await companyForm.getByRole("button", { name: "Cancel" }).click();

  await filters.getByLabel("Outside-EU hiring").selectOption("likely");
  await filters.getByLabel("Company priority").selectOption("A");
  await filters.getByLabel("Minimum tech stack match").fill("80");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(companyTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await expect(page.getByText("No applications yet.")).toBeVisible();
  await filters.getByRole("button", { name: "Clear filters" }).click();

  const countryFilter = filters.getByRole("combobox", { name: "Country filter" });
  await countryFilter.fill("u");
  await expect(page.getByRole("option", { name: "Ukraine" })).toBeVisible();
  await expect(page.getByRole("option", { name: "United States" })).toBeVisible();
  await page.getByRole("button", { name: "All countries" }).click();

  await page.getByRole("button", { name: "Add vacancy / application" }).click();
  const form = page.getByRole("form", { name: "Application details" });
  await form.getByRole("combobox", { name: "Company", exact: true }).selectOption({ label: "Acme GmbH" });
  await expect(form.getByLabel("Country")).toBeVisible();
  await form.getByLabel("Country").fill("u");
  await form.getByRole("option", { name: "Ukraine" }).click();
  await form.getByLabel("Job title / position applied for").fill("Full Stack Developer");
  await form.getByLabel("URL").fill("https://example.com/jobs/1");
  await form.getByLabel("Keywords").fill("python, django, react, mysql, docker");
  await expect(page.getByText("Next step: Apply now")).toBeVisible();
  await form.getByLabel("Vacancy status").selectOption("none");
  await form.getByLabel("Outside-EU answer").selectOption("yes_open");
  await form.getByLabel("Hiring pattern").selectOption("Q4");
  await form.getByRole("button", { name: "Save" }).click();

  const applicationsTable = page.getByRole("region", { name: "Applications table" });
  await expect(applicationsTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await expect(applicationsTable.getByRole("cell", { name: "Full Stack Developer" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Speculative" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Target" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Q4" })).toBeVisible();
  await expect(applicationsTable.getByRole("cell", { name: "Ukraine" })).toBeVisible();
  await expect(companyTable.getByRole("cell", { name: "1", exact: true })).toBeVisible();

  await filters.getByLabel("Job title").fill("Full Stack");
  await filters.getByLabel("Job requirements").fill("docker");
  await expect(applicationsTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await filters.getByLabel("Job requirements").fill("Kubernetes");
  await expect(applicationsTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No applications match these filters.")).toBeVisible();
  await filters.getByRole("button", { name: "Clear filters" }).click();
  await expect(applicationsTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await filters.getByLabel("Outside-EU hiring").selectOption("likely");
  await filters.getByLabel("Company priority").selectOption("A");
  await filters.getByLabel("Minimum tech stack match").fill("80");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("cell", { name: "Full Stack Developer" })).toBeVisible();
});

test("configures profession fields, saves values, and filters by a custom tag", async ({ authenticatedPage: page }) => {
  await page.getByRole("button", { name: "Custom data & profile settings" }).click();
  await page.getByLabel("Profession template").fill("Software / DevOps");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByLabel("Field name").fill("Tech Stack");
  await page.getByRole("button", { name: "Add custom field", exact: true }).click();
  await page.getByRole("button", { name: "Hide custom data settings" }).click();

  await page.getByRole("button", { name: "Add company" }).click();
  const companyForm = page.getByRole("form", { name: "Company research" });
  await companyForm.getByLabel("Company name").fill("CloudScale Berlin GmbH");
  await companyForm.getByLabel("Outside-EU hiring").selectOption("unverified");
  await companyForm.getByLabel("Tech stack match").fill("90");
  await companyForm.getByRole("button", { name: "Save company" }).click();

  await page.getByRole("button", { name: "Add vacancy / application" }).click();
  const form = page.getByRole("form", { name: "Application details" });
  await form.getByRole("combobox", { name: "Company", exact: true }).selectOption({ label: "CloudScale Berlin GmbH" });
  await form.getByLabel("Job title / position applied for").fill("DevOps Engineer");
  await form.getByLabel("URL").fill("https://example.com/jobs/devops");
  await form.getByLabel("Keywords").fill("python, django, react, mysql, docker");
  await form.getByLabel("Tech Stack").fill("Kubernetes, AWS");
  await form.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("cell", { name: "Kubernetes, AWS" })).toBeVisible();
  const filters = page.getByRole("complementary", { name: "Application filters" });
  await filters.getByRole("textbox", { name: "Tech Stack" }).fill("AWS");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  const applicationsTable = page.getByRole("region", { name: "Applications table" });
  await expect(applicationsTable.getByRole("cell", { name: "CloudScale Berlin GmbH", exact: true })).toBeVisible();
  await filters.getByRole("textbox", { name: "Tech Stack" }).fill("Terraform");
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
