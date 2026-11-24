import { expect, test } from "@playwright/test";
import { sendAndWait, signUp } from "./helpers";

test("streams a reply, keeps history and supports ratings", async ({ page }) => {
  await signUp(page);
  await sendAndWait(page, "Write a python function for fibonacci");
  await expect(page).toHaveURL(/\/chat\/[a-f0-9]+/);
  await expect(page.locator("pre code").first()).toContainText("def fibonacci");

  // Title generated from the first message appears in the sidebar
  await expect(page.getByRole("navigation", { name: "Conversations" }).getByText("Write a python function for")).toBeVisible();

  // Thumbs down opens the feedback dialog
  await page.getByRole("button", { name: "Bad response" }).last().click();
  await page.getByRole("button", { name: "Too long" }).click();
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("button", { name: "Bad response" }).last()).toHaveAttribute("aria-pressed", "true");

  // History survives a reload
  await page.reload();
  await expect(page.locator("pre code").first()).toContainText("def fibonacci");
});

test("stop keeps a partial answer and regenerate replaces it", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Message", { exact: true }).fill(`Explain how WebSockets work ${Date.now()}`);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Stop generating" }).click({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible();
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".prose-chat")).toHaveCount(1);
});

test("chat modes, translate and search", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: /Casual/ }).click();
  await page.getByRole("option", { name: /Coding/ }).click();
  await sendAndWait(page, "hello there");
  await page.getByRole("button", { name: "Translate" }).last().click();
  await page.getByRole("button", { name: "Hindi" }).click();
  await expect(page.getByText("Translated to Hindi")).toBeVisible();

  await page.getByLabel("Search conversations").fill("zzzz-no-match");
  await expect(page.getByText("No chats match your search.")).toBeVisible();
  await page.getByLabel("Search conversations").fill("hello");
  await expect(page.getByRole("navigation", { name: "Conversations" }).getByText("Hello there")).toBeVisible();
});

test("rename and delete a conversation", async ({ page }) => {
  await signUp(page);
  await sendAndWait(page, "tell me a joke");
  const nav = page.getByRole("navigation", { name: "Conversations" });
  await nav.getByRole("button", { name: "Conversation options" }).first().click();
  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Conversation title").fill("Jokes");
  await page.keyboard.press("Enter");
  await expect(nav.getByText("Jokes")).toBeVisible();
  await nav.getByRole("button", { name: "Conversation options" }).first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(nav.getByText("Jokes")).toHaveCount(0);
});
