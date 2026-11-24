import { expect, type Page } from "@playwright/test";

export const uniqueEmail = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;

export async function signUp(page: Page, name = "E2E Tester") {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.getByLabel("Name").filter({ visible: true }).fill(name);
  await page.getByLabel("Email").filter({ visible: true }).fill(email);
  await page.locator("#password:visible").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/chat$/);
  return { email, password: "Password123" };
}

export async function sendAndWait(page: Page, text: string) {
  await page.getByLabel("Message", { exact: true }).fill(text);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible({ timeout: 20_000 });
}
