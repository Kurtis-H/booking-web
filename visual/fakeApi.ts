import type { Page, Route } from "@playwright/test";
import type { EventSummary, Order, Seat } from "../src/api/client";

/**
 * Fixed data for the visual tests. Screenshots compare pixels, so everything on
 * the page must be the same on every run: no live API, no seats bought by other
 * tests, no event ids (which pick each event's color) that change between runs.
 */
const VENUES = ["The Grand Theater", "Riverside Hall", "The Blue Room", "Civic Arena"];
const NAMES = [
  "Jazz at the Grand",
  "Spring Symphony",
  "Comedy Night",
  "Indie Showcase",
  "Film Score Live",
  "Acoustic Sessions",
  "Ballet Gala",
  "Late Night Blues",
];

export const events: EventSummary[] = NAMES.map((name, i) => ({
  id: i + 1,
  name,
  venue: VENUES[i % VENUES.length]!,
  starts_at: new Date(Date.UTC(2027, 2, 12 + i * 3, 2, 30)).toISOString(),
  available_seats: [86, 40, 12, 0, 64, 3, 120, 25][i]!,
}));

const LAYOUT = [
  { section: "Orchestra", rows: 3, perRow: 14, price: 9000 },
  { section: "Mezzanine", rows: 2, perRow: 12, price: 6500 },
  { section: "Balcony", rows: 2, perRow: 10, price: 4000 },
];
const ROW_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Event 1's seats: a three-section theater with a few seats already sold. */
export const seats: Seat[] = (() => {
  const all: Seat[] = [];
  let letter = 0;
  for (const { section, rows, perRow, price } of LAYOUT) {
    for (let r = 0; r < rows; r++) {
      const row = ROW_LETTERS[letter++]!;
      for (let n = 1; n <= perRow; n++) {
        const sold = (row === "A" && n >= 6 && n <= 8) || (row === "D" && n <= 4);
        all.push({
          id: all.length + 1,
          label: `${row}-${n}`,
          price_cents: price,
          status: sold ? "sold" : "available",
          section,
          row,
          number: n,
        });
      }
    }
  }
  return all;
})();

export const order: Order = {
  id: 1042,
  total_cents: 27000,
  created_at: "2026-11-20T18:05:00Z",
  items: ["B-6", "B-7", "B-8"].map((label) => {
    const seat = seats.find((s) => s.label === label)!;
    return { seat_id: seat.id, label, price_cents: seat.price_cents };
  }),
};

type Options = {
  /** Make every order request fail with this status, as the real API would. */
  orderFails?: 409 | 503;
  /** Leave the API silent, so the page shows its loading state. */
  hang?: boolean;
  /** An event with no seats left at all. */
  soldOut?: boolean;
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Answer every /api request from the fixed data above. */
export async function fakeApi(page: Page, options: Options = {}): Promise<void> {
  await page.route("**/api/**", async (route) => {
    if (options.hang) return; // never answered
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    if (path === "/events") {
      return json(route, {
        items: events.slice(offset, offset + limit),
        total: events.length,
        limit,
        offset,
      });
    }
    const event = path.match(/^\/events\/(\d+)$/);
    if (event) {
      const found = events.find((e) => e.id === Number(event[1]));
      if (!found) return json(route, { detail: "Event not found" }, 404);
      return json(route, options.soldOut ? { ...found, available_seats: 0 } : found);
    }
    if (/^\/events\/\d+\/seats$/.test(path)) {
      const status = url.searchParams.get("status") ?? "available";
      const items = options.soldOut
        ? status === "sold"
          ? seats.map((s) => ({ ...s, status: "sold" }))
          : []
        : seats.filter((s) => s.status === status);
      return json(route, { items: items.slice(offset, offset + limit), limit, offset });
    }
    if (path === "/orders" && route.request().method() === "POST") {
      if (options.orderFails === 409) {
        return json(route, { detail: "One or more seats are no longer available" }, 409);
      }
      if (options.orderFails === 503) {
        return route.fulfill({
          status: 503,
          headers: { "Retry-After": "5" },
          contentType: "application/json",
          body: JSON.stringify({ detail: "The booking service is busy" }),
        });
      }
      return json(route, order, 201);
    }
    if (path === "/orders") return json(route, { items: [order], limit, offset });
    if (path === `/orders/${order.id}`) return json(route, order);
    return json(route, { detail: "Not found" }, 404);
  });
}
