import { expect, test, type Page } from "@playwright/test";
import { fakeApi } from "./fakeApi";

/**
 * Visual regression: each key screen is compared with an approved screenshot,
 * on desktop and on a phone. A change in layout, color, spacing or fonts
 * fails the test with a diff image. Baselines are made in CI (see README).
 */

const signIn = (page: Page) =>
  page.addInitScript(() => sessionStorage.setItem("booking.apiKey", "key-user-1"));

test.beforeEach(async ({ page }) => {
  // "Today" is fixed, so any relative dates render the same on every run.
  await page.clock.setFixedTime(new Date("2026-11-27T17:00:00Z"));
});

test("event list", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Jazz at the Grand" })).toBeVisible();
  await expect(page).toHaveScreenshot("event-list.png", { fullPage: true });
});

test("seat map with seats selected", async ({ page }) => {
  await fakeApi(page);
  await signIn(page);
  await page.goto("/events/1");
  for (const seat of ["B-6", "B-7", "B-8"]) {
    await page.getByRole("button", { name: `Seat ${seat}, $90.00` }).click();
  }
  await expect(page.getByTestId("order-total")).toHaveText("$270.00");
  await expect(page).toHaveScreenshot("seat-map.png", { fullPage: true });
});

test("seat map when a seat is taken first", async ({ page }) => {
  await fakeApi(page, { orderFails: 409 });
  await signIn(page);
  await page.goto("/events/1");
  await page.getByRole("button", { name: "Seat B-6, $90.00" }).click();
  await page.getByRole("button", { name: "Buy 1 seat" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("order-summary")).toHaveScreenshot("seat-taken.png");
});

test("seat map when the service is busy", async ({ page }) => {
  await fakeApi(page, { orderFails: 503 });
  await signIn(page);
  await page.goto("/events/1");
  await page.getByRole("button", { name: "Seat B-6, $90.00" }).click();
  await page.getByRole("button", { name: "Buy 1 seat" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("order-summary")).toHaveScreenshot("service-busy.png");
});

test("sold-out event", async ({ page }) => {
  await fakeApi(page, { soldOut: true });
  await page.goto("/events/1");
  await expect(page.getByText("No seats are available for this event.")).toBeVisible();
  await expect(page).toHaveScreenshot("sold-out.png", { fullPage: true });
});

test("loading", async ({ page }) => {
  await fakeApi(page, { hang: true });
  await page.goto("/");
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page).toHaveScreenshot("loading.png");
});

test("order confirmation", async ({ page }) => {
  await fakeApi(page);
  await signIn(page);
  await page.goto("/events/1");
  await page.getByRole("button", { name: "Seat B-6, $90.00" }).click();
  await page.getByRole("button", { name: "Buy 1 seat" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Order #1042" })).toBeVisible();
  await expect(page).toHaveScreenshot("order-confirmation.png", { fullPage: true });
});

test("my orders", async ({ page }) => {
  await fakeApi(page);
  await signIn(page);
  await page.goto("/orders");
  await expect(page.getByTestId("order-row")).toBeVisible();
  await expect(page).toHaveScreenshot("my-orders.png", { fullPage: true });
});

test("sign in", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveScreenshot("sign-in.png", { fullPage: true });
});
