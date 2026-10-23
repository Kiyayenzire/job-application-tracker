import { expect, test } from "../fixtures.js";

test("preserves a saved session during a temporary auth check failure", async ({ page }) => {
  const savedToken = "existing-session-token";
  let attempts = 0;

  await page.addInitScript((token) => {
    localStorage.setItem("authToken", token);
  }, savedToken);
  await page.route("**/api/auth/me/", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        json: { detail: "Temporarily unavailable." },
      });
      return;
    }
    await route.fulfill({ json: { id: 1, username: "existing-user" } });
  });

  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText(
    "Unable to verify your saved session",
  );
  expect(await page.evaluate(() => localStorage.getItem("authToken"))).toBe(savedToken);
  await page.getByRole("button", { name: "Retry session check" }).click();

  await expect(page.getByRole("heading", { name: "Job Application Tracker" })).toBeVisible();
  expect(attempts).toBe(2);
});

test("clears a saved session only when the auth endpoint returns 401", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("authToken", "expired-session-token");
  });
  await page.route("**/api/auth/me/", (route) =>
    route.fulfill({ status: 401, json: { detail: "Invalid token." } }),
  );

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("authToken"))).toBeNull();
});

test("shows shared navigation on login and account creation pages", async ({ page }) => {
  await page.route("**/api/auth/me/", (route) =>
    route.fulfill({ status: 401, json: { detail: "Not authenticated." } }),
  );

  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

  await page.goto("/create-account");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Login" })).toBeVisible();
});
