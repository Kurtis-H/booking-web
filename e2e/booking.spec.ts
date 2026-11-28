import { expect, test } from "./fixtures";

test.describe("browsing", () => {
  test("lists events and pages through them", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
    await expect(page.getByTestId("event-card").first()).toBeVisible();
    await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
  });

  test("signed-out visitors are asked to sign in before buying", async ({ page, newEvent }) => {
    const event = await newEvent(2);
    await page.goto(`/events/${event.id}`);
    await page.getByRole("link", { name: "Sign in to buy" }).click();
    await page.getByRole("button", { name: "use the demo account" }).click();
    // back on the event, now able to buy
    await expect(page).toHaveURL(new RegExp(`/events/${event.id}$`));
    await expect(page.getByRole("button", { name: "Select seats to buy" })).toBeDisabled();
  });
});

test.describe("buying", () => {
  test("buys two seats and finds them under My orders", async ({ signedInPage: page, newEvent }) => {
    const event = await newEvent(4, 3500);
    await page.goto(`/events/${event.id}`);

    await page.getByRole("button", { name: /^Seat S-1,/ }).click();
    await page.getByRole("button", { name: /^Seat S-2,/ }).click();
    await expect(page.getByTestId("order-total")).toHaveText("$70.00");
    await page.getByRole("button", { name: "Buy 2 seats" }).click();

    await expect(page.getByTestId("order-confirmation")).toBeVisible();
    await expect(page.getByTestId("order-detail-total")).toHaveText("$70.00");
    await expect(page.getByRole("cell", { name: "S-1", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "S-2", exact: true })).toBeVisible();
    const orderHeading = await page.getByRole("heading", { level: 1 }).textContent();

    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My orders" }).click();
    await expect(page.getByTestId("order-row").first()).toContainText(orderHeading!.trim());

    // the seats are gone from the event
    await page.goto(`/events/${event.id}`);
    await expect(page.getByText("2 seats available")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Seat S-1,/ })).toHaveCount(0);
  });

  test("losing a seat to another buyer is handled cleanly", async ({
    signedInPage: page,
    newEvent,
    bookingApi,
  }) => {
    const event = await newEvent(2);
    await page.goto(`/events/${event.id}`);
    await page.getByRole("button", { name: /^Seat S-1,/ }).click();

    // Someone else buys the same seat while we're deciding.
    const rival = await bookingApi.post("/orders", {
      headers: { "X-API-Key": "key-user-55" },
      data: { seat_ids: [event.seatIds[0]] },
    });
    expect(rival.status()).toBe(201);

    await page.getByRole("button", { name: "Buy 1 seat" }).click();
    await expect(page.getByRole("alert")).toContainText("Someone just took one of those seats");
    await expect(page.getByRole("button", { name: /^Seat S-1,/ })).toHaveCount(0);
    await expect(page.getByTestId("order-total")).toHaveText("$0.00");
  });

  test("cannot read another buyer's order", async ({ signedInPage: page, newEvent, bookingApi }) => {
    const event = await newEvent(1);
    const theirs = await bookingApi.post("/orders", {
      headers: { "X-API-Key": "key-user-56" },
      data: { seat_ids: event.seatIds },
    });
    const { id } = (await theirs.json()) as { id: number };
    await page.goto(`/orders/${id}`);
    await expect(page.getByRole("alert")).toHaveText("We couldn't find that.");
  });
});

test("an unknown API key is refused", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("API key").fill("key-not-real");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("That API key wasn't recognized.");
});
