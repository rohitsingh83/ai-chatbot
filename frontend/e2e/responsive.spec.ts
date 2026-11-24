import { expect, test } from "@playwright/test";
import { sendAndWait, signUp } from "./helpers";

test("works on a phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Conversations/ })).toBeVisible();
  // no horizontal scrolling
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await signUp(page);
  await sendAndWait(page, "What can you do?");
  await page.getByRole("button", { name: "Open sidebar" }).click();
  await expect(page.getByRole("navigation", { name: "Conversations" }).last()).toBeVisible();
});
