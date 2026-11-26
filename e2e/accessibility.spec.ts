import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

// Every main screen must have no WCAG 2.1 A/AA violations that axe can detect.
async function expectNoViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(summary).toEqual([]);
}

test("event list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("event-card").first()).toBeVisible();
  await expectNoViolations(page);
});

test("event page with seats selected", async ({ signedInPage: page, newEvent }) => {
  const event = await newEvent(24);
  await page.goto(`/events/${event.id}`);
  await page.getByRole("button", { name: /^Seat S-1,/ }).click();
  await expectNoViolations(page);
});

test("sign in, with an error showing", async ({ page }) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expectNoViolations(page);
});

test("order confirmation", async ({ signedInPage: page, newEvent }) => {
  const event = await newEvent(1);
  await page.goto(`/events/${event.id}`);
  await page.getByRole("button", { name: /^Seat S-1,/ }).click();
  await page.getByRole("button", { name: "Buy 1 seat" }).click();
  await expect(page.getByTestId("order-confirmation")).toBeVisible();
  await expectNoViolations(page);
});

test("keyboard only: pick a seat and buy", async ({ signedInPage: page, newEvent }) => {
  const event = await newEvent(2);
  await page.goto(`/events/${event.id}`);
  const seat = page.getByRole("button", { name: /^Seat S-1,/ });
  await seat.focus();
  await page.keyboard.press("Enter");
  await expect(seat).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Buy 1 seat" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("order-confirmation")).toBeVisible();
});
