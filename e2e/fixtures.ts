import { test as base, expect, request, type APIRequestContext, type Page } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
let userCounter = 0;

type Fixtures = {
  /** Talks to the booking API directly (setup and "another buyer"). */
  bookingApi: APIRequestContext;
  /** Creates a fresh event with its own seats, so tests never share seats. */
  newEvent: (seats?: number, priceCents?: number) => Promise<{ id: number; seatIds: number[] }>;
  /** A buyer key no other test in this run uses. */
  buyerKey: string;
  /** Opens the app already signed in as buyerKey. */
  signedInPage: Page;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  bookingApi: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    await use(ctx);
    await ctx.dispose();
  },
  newEvent: async ({ bookingApi }, use, testInfo) => {
    await use(async (seats = 6, priceCents = 3500) => {
      const created = await bookingApi.post("/admin/events", {
        headers: { "X-API-Key": "key-admin" },
        data: {
          name: `E2E ${testInfo.title.slice(0, 40)}`,
          venue: "Playwright Hall",
          starts_at: "2027-06-01T19:00:00Z",
          seats,
          price_cents: priceCents,
        },
      });
      expect(created.status(), await created.text()).toBe(201);
      const { id } = (await created.json()) as { id: number };
      const page = await bookingApi.get(`/events/${id}/seats?limit=100`);
      const seatIds = ((await page.json()) as { items: { id: number }[] }).items.map((s) => s.id);
      return { id, seatIds };
    });
  },
  // eslint-disable-next-line no-empty-pattern
  buyerKey: async ({}, use, testInfo) => {
    // Spread buyers across seeded users so the API's per-key rate limit never
    // links two tests together.
    userCounter += 1;
    await use(`key-user-${((testInfo.workerIndex * 37 + userCounter) % 50) + 1}`);
  },
  signedInPage: async ({ page, buyerKey }, use) => {
    await page.addInitScript((key) => sessionStorage.setItem("booking.apiKey", key), buyerKey);
    await use(page);
  },
});

export { expect };
