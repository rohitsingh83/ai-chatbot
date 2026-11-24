import { expect, test } from "@playwright/test";
import { sendAndWait, signUp } from "./helpers";

test("personalisation applies everywhere", async ({ page }) => {
  await signUp(page);
  await page.goto("/settings");
  await page.getByLabel("Assistant name").fill("Jarvis");
  await page.getByRole("button", { name: "Save" }).first().click();
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Emerald accent" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "emerald");

  await page.getByLabel("Custom instructions").fill("I am a student. Keep it simple.");
  await page.getByRole("button", { name: "Save instructions" }).click();
  await expect(page.getByText("Custom instructions saved")).toBeVisible();

  await page.goto("/chat");
  await expect(page.getByText("I'm Jarvis. How can I help you today?")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "emerald");
});

test("regular users cannot open the admin dashboard", async ({ page }) => {
  await signUp(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/chat$/);
});

test("admin dashboard shows analytics", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Demo admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const t of ["Total users", "Satisfaction", "Activity", "Chat modes", "Busiest hours", "Recent activity", "Users"]) {
    await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  }
  await expect(page.locator("table tbody tr").first()).toBeVisible();
});

test("sign out of other devices revokes old sessions", async ({ browser }) => {
  const a = await browser.newPage();
  await signUp(a);
  await sendAndWait(a, "hello");
  const token = await a.evaluate(() => localStorage.getItem("nova.token"));
  await a.goto("/settings");
  await a.getByRole("button", { name: "Sign out other devices" }).click();
  await expect(a.getByText("Signed out of all other devices")).toBeVisible();

  const b = await browser.newPage();
  await b.goto("/");
  await b.evaluate((t) => localStorage.setItem("nova.token", t!), token);
  await b.goto("/chat");
  await expect(b).toHaveURL(/\/login/);
  // The current device keeps working
  await a.goto("/chat");
  await expect(a).toHaveURL(/\/chat$/);
});
