#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];

async function shot(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}`, fullPage: true });
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await shot(page, "landing-final.png");

  await page.goto("http://127.0.0.1:8080/guide", { waitUntil: "networkidle" });
  await shot(page, "guide.png");

  await page.goto("http://127.0.0.1:8080/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Need an account/i }).click();
  await page.getByPlaceholder("Name").fill("Meera Iyer");
  await page.getByPlaceholder("Work email").fill(`meera.${Date.now()}@kitepay.dev`);
  await page.getByPlaceholder("Password").fill("conduit-demo-2026");
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL("**/app**", { timeout: 20000 });
  await page.waitForTimeout(600);
  await shot(page, "app-incident.png");

  const sweep = page.getByRole("button", { name: /Run incident sweep/i });
  await sweep.click();
  await page.getByText("Auth incident", { timeout: 30000 }).waitFor();
  await page.waitForTimeout(400);
  await shot(page, "app-incident-result.png");

  const fileBtn = page.getByRole("button", { name: /File Linear ticket/i });
  if (await fileBtn.count()) await fileBtn.click();
  await page.waitForTimeout(800);
  await shot(page, "app-incident-ticket.png");

  await page.goto("http://127.0.0.1:8080/app/inspector", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Fill example/i }).click();
  await page.getByRole("button", { name: /Call tool/i }).click();
  await page.waitForTimeout(1200);
  await shot(page, "app-inspector-result.png");

  await page.goto("http://127.0.0.1:8080/app/audit", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot(page, "app-audit.png");

  await page.goto("http://127.0.0.1:8080/app/approvals", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot(page, "app-approvals.png");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await mobile.screenshot({ path: "/workspace/screenshots/landing-mobile.png", fullPage: true });
  await mobile.goto("http://127.0.0.1:8080/guide", { waitUntil: "networkidle" });
  await mobile.screenshot({ path: "/workspace/screenshots/guide-mobile.png", fullPage: true });
  await mobile.close();

  console.log(JSON.stringify({ errors, ok: errors.length === 0 }, null, 2));
} finally {
  await browser.close();
}
