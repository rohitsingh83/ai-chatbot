import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

/** A one-page PDF with a single line of text. */
function makePdf(text: string) {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

test("attach a CSV and a PDF and the assistant reads them", async ({ page }) => {
  await signUp(page);
  await page.locator('input[type="file"]').setInputFiles([
    { name: "scores.csv", mimeType: "text/csv", buffer: Buffer.from("name,score\nAsha,91\nRavi,84\n") },
    { name: "report.pdf", mimeType: "application/pdf", buffer: makePdf("Quarterly revenue grew 12 percent") },
  ]);
  await expect(page.getByText("scores.csv")).toBeVisible();
  await expect(page.getByText("report.pdf")).toBeVisible();
  await expect(page.getByText("Reading…")).toHaveCount(0, { timeout: 10_000 });

  await page.getByLabel("Message", { exact: true }).fill("What is in these files?");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("I read your 2 files")).toBeVisible();
  await expect(page.getByText("Quarterly revenue grew 12 percent")).toBeVisible();

  // The chips stay on the message after a reload.
  await page.reload();
  await expect(page.locator("span", { hasText: /^report\.pdf$/ })).toBeVisible();
});
