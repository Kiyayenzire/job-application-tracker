import { expect, test } from "../fixtures.js";

test("login redirects to applications and company research has its own page", async ({ page }) => {
  await page.route("**/api/auth/login/", (route) => route.fulfill({
    json: { token: "login-test-token", user: { id: 1, username: "login-user" } },
  }));
  await page.route("**/api/auth/me/", (route) => route.fulfill({
    status: 401,
    json: { detail: "Not authenticated." },
  }));
  await page.route("**/api/applications/", (route) => route.fulfill({
    json: { results: [] },
  }));
  await page.route("**/api/companies/**", (route) => route.fulfill({
    json: { results: [] },
  }));
  await page.route("**/api/custom-fields/", (route) => route.fulfill({
    json: { results: [] },
  }));
  await page.route("**/api/countries/", (route) => route.fulfill({
    json: [{ code: "de", name: "Germany" }],
  }));

  await page.goto("/login");
  await page.getByLabel("Username").fill("login-user");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/applications$/);
  await expect(page.getByRole("heading", { name: "Job applications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Applications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Companies" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("link", { name: "CV" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Help & Support" })).toBeVisible();
  await expect(page.getByText("Company research")).toHaveCount(0);

  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByRole("heading", { name: "Company intelligence" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Job applications" })).toHaveCount(0);
  await page.getByRole("link", { name: "Applications" }).click();
  await expect(page).toHaveURL(/\/applications$/);
});

test("users can edit their profile and CV and contact support", async ({ authenticatedPage: page }) => {
  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Location").fill("Kampala, Uganda");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved.");

  await page.getByRole("link", { name: "CV" }).click();
  await page.getByLabel("Professional summary").fill("Experienced software engineer.");
  await page.getByRole("button", { name: "Save CV" }).click();
  await expect(page.getByRole("status")).toHaveText("CV saved.");
  const wordDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word" }).click();
  expect((await wordDownloadPromise).suggestedFilename()).toBe("candidate-cv.docx");
  const pdfDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect((await pdfDownloadPromise).suggestedFilename()).toBe("candidate-cv.pdf");

  await page.getByRole("link", { name: "Help & Support" }).click();
  await expect(page.getByRole("link", { name: "zoelewis.58@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:zoelewis.58@gmail.com",
  );
});

test("applications page does not expose application or company filters", async ({ authenticatedPage: page }) => {
  await expect(page.getByRole("button", { name: "Filter applications" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Application filters" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Custom data & profile settings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Custom data and tracking settings" })).toHaveCount(0);
});

test("creates an application from the authenticated tracker", async ({ authenticatedPage: page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await expect(page.getByRole("heading", { name: "Job applications" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GERMANY" })).toHaveCount(0);

  await page.getByRole("link", { name: "Companies" }).click();
  await page.getByRole("button", { name: "Add company research" }).click();
  expect(pageErrors, JSON.stringify(pageErrors)).toEqual([]);
  const companyForm = page.getByRole("form", { name: "Company research" });
  await expect(companyForm).toBeVisible();
  await page.getByLabel("Company name").fill("Acme GmbH");
  await companyForm.getByLabel("Country").fill("u");
  await companyForm.getByRole("option", { name: "Uganda" }).click();
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

  await expect(companyTable.getByRole("cell", { name: "Acme GmbH", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Applications" }).click();
  await expect(page.getByRole("region", { name: "Companies table" })).toHaveCount(0);
  await expect(page.getByText("No applications yet.")).toBeVisible();

  await page.getByRole("button", { name: "Add application" }).click();
  const form = page.getByRole("form", { name: "Application details" });
  await form.getByLabel("Company name").fill("Acme GmbH");
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
  await page.getByRole("link", { name: "Companies" }).click();
  await expect(companyTable.getByRole("cell", { name: "1", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Applications" }).click();
  await expect(page.getByRole("cell", { name: "Full Stack Developer" })).toBeVisible();
});

test("keeps applications page filter-free on narrow screens", async ({ authenticatedPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Filter applications" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Application filters" })).toHaveCount(0);
});

test("keeps application and company custom fields separate and available in the shared navigation", async ({ authenticatedPage: page }) => {
  await page.getByRole("button", { name: "Customize application fields" }).click();
  const applicationFields = page.getByRole("region", { name: "application custom fields" });
  await applicationFields.getByLabel("Field name").fill("Court Level");
  await applicationFields.getByRole("button", { name: "Add custom field" }).click();
  await expect(applicationFields.getByText("Court Level")).toBeVisible();

  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("group", { name: "Custom data / profession-specific details" })).toContainText("Court Level");
  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();

  await page.getByRole("button", { name: "Customize company fields" }).click();
  const companyFields = page.getByRole("region", { name: "company custom fields" });
  await companyFields.getByLabel("Field name").fill("Practice Area");
  await companyFields.getByRole("button", { name: "Add custom field" }).click();

  await page.getByRole("button", { name: "Add company research" }).click();
  const companyForm = page.getByRole("form", { name: "Company research" });
  await companyForm.getByLabel("Company name").fill("Legal Partners");
  await companyForm.getByLabel("Country").fill("u");
  await companyForm.getByRole("option", { name: "Uganda" }).click();
  await companyForm.getByLabel("Practice Area").fill("Employment, Immigration");
  await companyForm.getByRole("button", { name: "Save company" }).click();

  await expect(page.getByRole("columnheader", { name: "Practice Area" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Employment, Immigration" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize application fields" })).toHaveCount(0);
});
