import { http, HttpResponse } from "msw";
import type { EventSummary, Order, Seat } from "../api/client";

/**
 * An in-memory stand-in for the booking API, used by component tests.
 * It follows the real API's rules: 401 for unknown keys, 409 when a seat is
 * taken, 404 for unknown ids. The end-to-end tests use the real API instead.
 */
export const VALID_KEYS = new Set(["key-user-1", "key-user-2"]);

type State = {
  events: Omit<EventSummary, "available_seats">[];
  seats: Map<number, (Seat & { eventId: number })[]>;
  orders: (Order & { owner: string })[];
};

export const db: State = { events: [], seats: new Map(), orders: [] };

export function resetDb({ events = 30, seatsPerEvent = 24 } = {}): void {
  db.events = Array.from({ length: events }, (_, i) => ({
    id: i + 1,
    name: `Event ${i + 1}`,
    venue: `Venue ${(i % 3) + 1}`,
    starts_at: new Date(Date.UTC(2027, 0, i + 2, 19)).toISOString(),
  }));
  db.seats = new Map();
  let seatId = 1;
  for (const event of db.events) {
    db.seats.set(
      event.id,
      Array.from({ length: seatsPerEvent }, (_, n) => ({
        id: seatId++,
        eventId: event.id,
        label: `R${Math.floor(n / 12) + 1}-${(n % 12) + 1}`,
        price_cents: 2500 + Math.floor(n / 12) * 500,
        status: "available",
      })),
    );
  }
  db.orders = [];
}

const available = (eventId: number) =>
  (db.seats.get(eventId) ?? []).filter((s) => s.status === "available");

const notFound = (what: string) => HttpResponse.json({ detail: `${what} not found` }, { status: 404 });
const unauthorized = () => HttpResponse.json({ detail: "Unknown API key" }, { status: 401 });

function caller(request: Request): string | null {
  const key = request.headers.get("X-API-Key");
  return key && VALID_KEYS.has(key) ? key : null;
}

function pageParams(url: URL) {
  return {
    limit: Number(url.searchParams.get("limit") ?? 20),
    offset: Number(url.searchParams.get("offset") ?? 0),
  };
}

const publicOrder = ({ owner: _owner, ...order }: Order & { owner: string }): Order => order;

export const handlers = [
  http.get("*/api/events", ({ request }) => {
    const { limit, offset } = pageParams(new URL(request.url));
    const items = db.events
      .slice(offset, offset + limit)
      .map((e) => ({ ...e, available_seats: available(e.id).length }));
    return HttpResponse.json({ items, total: db.events.length, limit, offset });
  }),

  http.get("*/api/events/:id", ({ params }) => {
    const event = db.events.find((e) => e.id === Number(params.id));
    if (!event) return notFound("Event");
    return HttpResponse.json({ ...event, available_seats: available(event.id).length });
  }),

  http.get("*/api/events/:id/seats", ({ params, request }) => {
    const id = Number(params.id);
    if (!db.seats.has(id)) return notFound("Event");
    const url = new URL(request.url);
    const { limit, offset } = pageParams(url);
    const status = url.searchParams.get("status") ?? "available";
    const items = (db.seats.get(id) ?? [])
      .filter((s) => s.status === status)
      .slice(offset, offset + limit)
      .map(({ eventId: _e, ...seat }) => seat);
    return HttpResponse.json({ items, limit, offset });
  }),

  http.post("*/api/orders", async ({ request }) => {
    const owner = caller(request);
    if (!owner) return unauthorized();
    const { seat_ids } = (await request.json()) as { seat_ids: number[] };
    const all = [...db.seats.values()].flat();
    const seats = seat_ids.map((id) => all.find((s) => s.id === id));
    if (seats.some((s) => !s)) return notFound("Seat");
    if (seats.some((s) => s!.status !== "available")) {
      return HttpResponse.json({ detail: "One or more seats are already taken" }, { status: 409 });
    }
    seats.forEach((s) => (s!.status = "sold"));
    const order = {
      id: db.orders.length + 1,
      owner,
      total_cents: seats.reduce((sum, s) => sum + s!.price_cents, 0),
      created_at: new Date(Date.UTC(2026, 10, 26, 15)).toISOString(),
      items: seats.map((s) => ({ seat_id: s!.id, label: s!.label, price_cents: s!.price_cents })),
    };
    db.orders.push(order);
    return HttpResponse.json(publicOrder(order), { status: 201 });
  }),

  http.get("*/api/orders", ({ request }) => {
    const owner = caller(request);
    if (!owner) return unauthorized();
    const items = db.orders.filter((o) => o.owner === owner).reverse().map(publicOrder);
    return HttpResponse.json({ items, limit: 50, offset: 0 });
  }),

  http.get("*/api/orders/:id", ({ params, request }) => {
    const owner = caller(request);
    if (!owner) return unauthorized();
    const order = db.orders.find((o) => o.id === Number(params.id) && o.owner === owner);
    return order ? HttpResponse.json(publicOrder(order)) : notFound("Order");
  }),
];

/** Mark a seat sold behind the UI's back, as if another buyer got it first. */
export function sellBehindTheScenes(seatId: number): void {
  const seat = [...db.seats.values()].flat().find((s) => s.id === seatId);
  if (seat) seat.status = "sold";
}
