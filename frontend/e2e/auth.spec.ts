import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("landing page links to sign up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Conversations/ })).toBeVisible();
  await page.getByRole("link", { name: "Start chatting free" }).click();
  await expect(page).toHaveURL(/\/signup/);
});

test("sign up, log out and log back in", async ({ page }) => {
  const { email, password } = await signUp(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").filter({ visible: true }).fill(email);
  await page.locator("#password:visible").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/chat$/);
});

test("shows validation and wrong-password errors", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please enter your name")).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email").filter({ visible: true }).fill("demo@nova.dev");
  await page.locator("#password:visible").fill("wrong-password1");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Incorrect email or password")).toBeVisible();
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
});
