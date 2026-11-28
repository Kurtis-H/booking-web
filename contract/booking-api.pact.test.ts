/**
 * Consumer contract: what booking-web needs from the booking API.
 *
 * Each test records one interaction the app really makes, through the app's own
 * API client, against Pact's mock server. The recorded contract is written to
 * pacts/booking-web-booking-api.json and committed. api-performance-lab's CI
 * replays it against the real API, so a change there that would break this app
 * fails the API's build, before anything is deployed.
 *
 * Only fields the app reads are in the contract. The API can add fields or
 * change ones the app ignores without breaking it.
 */
import path from "node:path";
import { MatchersV3, PactV3, SpecificationVersion } from "@pact-foundation/pact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../src/api/client";
import { EVENTS_PER_PAGE } from "../src/pages/EventsPage";
import { SEATS_PER_PAGE } from "../src/pages/EventPage";

const { eachLike, integer, string, datetime, fromProviderState, regex } = MatchersV3;

const BUYER = "key-user-98";
const OTHER_BUYER = "key-user-99";

const provider = new PactV3({
  consumer: "booking-web",
  provider: "booking-api",
  dir: path.resolve(__dirname, "../pacts"),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
  logLevel: "warn",
});

// The shapes the app reads.
const event = {
  id: integer(1),
  name: string("Summer concert"),
  venue: string("Main hall"),
  starts_at: datetime("yyyy-MM-dd'T'HH:mm:ssXXX", "2027-06-01T19:00:00+00:00"),
  available_seats: integer(4),
};
const order = {
  id: integer(1),
  total_cents: integer(3500),
  created_at: datetime("yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX", "2026-11-27T16:00:00.000000+00:00"),
  items: eachLike({ seat_id: integer(1), label: string("R1-1"), price_cents: integer(3500) }),
};
const errorBody = { detail: string("Something went wrong") };

/** Point the app's client at the mock server for one interaction. */
async function asApp<T>(call: () => Promise<T>, mockUrl: string): Promise<T> {
  vi.stubEnv("VITE_API_BASE", mockUrl);
  return call();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("booking-web needs from the booking API", () => {
  it("a page of upcoming events", () => {
    provider
      .given("events exist")
      .uponReceiving("a request for the first page of events")
      .withRequest({
        method: "GET",
        path: "/events",
        query: { limit: String(EVENTS_PER_PAGE), offset: "0" },
        headers: { Accept: "application/json" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": regex("application/json.*", "application/json") },
        body: { items: eachLike(event), total: integer(30), offset: integer(0) },
      });
    return provider.executeTest(async (mock) => {
      const page = await asApp(() => api.listEvents(EVENTS_PER_PAGE, 0), mock.url);
      expect(page.items[0]?.name).toBe("Summer concert");
      expect(page.total).toBe(30);
    });
  });

  it("one event", () => {
    provider
      .given("an event with available seats exists")
      .uponReceiving("a request for an event")
      .withRequest({
        method: "GET",
        path: fromProviderState("/events/${eventId}", "/events/1"),
        headers: { Accept: "application/json" },
      })
      .willRespondWith({ status: 200, body: event });
    return provider.executeTest(async (mock) => {
      const found = await asApp(() => api.getEvent(1), mock.url);
      expect(found.available_seats).toBe(4);
    });
  });

  it("the seat map for an event", () => {
    provider
      .given("an event with available seats exists")
      .uponReceiving("a request for an event's seats")
      .withRequest({
        method: "GET",
        path: fromProviderState("/events/${eventId}/seats", "/events/1/seats"),
        query: { limit: String(SEATS_PER_PAGE), offset: "0" },
        headers: { Accept: "application/json" },
      })
      .willRespondWith({
        status: 200,
        body: {
          items: eachLike({
            id: integer(1),
            label: string("R1-1"),
            price_cents: integer(3500),
            status: regex("available|sold", "available"),
            // The map lays seats out by section and row, and shows the number.
            section: string("Orchestra"),
            row: string("R1"),
            number: integer(1),
          }),
          offset: integer(0),
        },
      });
    return provider.executeTest(async (mock) => {
      const page = await asApp(() => api.listSeats(1, SEATS_PER_PAGE, 0), mock.url);
      expect(page.items[0]?.status).toBe("available");
    });
  });

  it("the sold seats of an event, so the map can show them as taken", () => {
    provider
      .given("a seat has already been sold")
      .uponReceiving("a request for an event's sold seats")
      .withRequest({
        method: "GET",
        path: fromProviderState("/events/${eventId}/seats", "/events/1/seats"),
        query: { limit: String(SEATS_PER_PAGE), offset: "0", status: "sold" },
        headers: { Accept: "application/json" },
      })
      .willRespondWith({
        status: 200,
        body: {
          items: eachLike({
            id: integer(1),
            label: string("R1-1"),
            price_cents: integer(3500),
            status: regex("sold", "sold"),
            // The map lays seats out by section and row, and shows the number.
            section: string("Orchestra"),
            row: string("R1"),
            number: integer(1),
          }),
          offset: integer(0),
        },
      });
    return provider.executeTest(async (mock) => {
      const page = await asApp(() => api.listSeats(1, SEATS_PER_PAGE, 0, undefined, "sold"), mock.url);
      expect(page.items[0]?.status).toBe("sold");
    });
  });

  it("buying a seat", () => {
    provider
      .given("an event with available seats exists")
      .uponReceiving("an order for an available seat")
      .withRequest({
        method: "POST",
        path: "/orders",
        headers: { "X-API-Key": BUYER, "Content-Type": "application/json" },
        body: { seat_ids: [fromProviderState("${seatId}", 1)] },
      })
      .willRespondWith({ status: 201, body: order });
    return provider.executeTest(async (mock) => {
      const placed = await asApp(() => api.createOrder([1], BUYER), mock.url);
      expect(placed.items[0]?.label).toBe("R1-1");
    });
  });

  it("a 409 with a reason when someone else bought the seat first", () => {
    provider
      .given("a seat has already been sold")
      .uponReceiving("an order for a seat that is already sold")
      .withRequest({
        method: "POST",
        path: "/orders",
        headers: { "X-API-Key": BUYER, "Content-Type": "application/json" },
        body: { seat_ids: [fromProviderState("${seatId}", 1)] },
      })
      .willRespondWith({ status: 409, body: errorBody });
    return provider.executeTest(async (mock) => {
      const failure = await asApp(() => api.createOrder([1], BUYER), mock.url).catch((e) => e);
      expect(failure).toBeInstanceOf(ApiError);
      expect(failure.status).toBe(409);
      expect(failure.message).toBe("Something went wrong");
    });
  });

  it("the buyer's orders", () => {
    provider
      .given("the buyer has an order")
      .uponReceiving("a request for the buyer's orders")
      .withRequest({
        method: "GET",
        path: "/orders",
        query: { limit: "50" },
        headers: { "X-API-Key": BUYER, Accept: "application/json" },
      })
      .willRespondWith({ status: 200, body: { items: eachLike(order) } });
    return provider.executeTest(async (mock) => {
      const page = await asApp(() => api.listOrders(BUYER), mock.url);
      expect(page.items[0]?.total_cents).toBe(3500);
    });
  });

  it("a 401 for a key that isn't valid (the sign-in check)", () => {
    provider
      .uponReceiving("a request for orders with an unknown key")
      .withRequest({
        method: "GET",
        path: "/orders",
        query: { limit: "50" },
        headers: { "X-API-Key": "key-does-not-exist", Accept: "application/json" },
      })
      .willRespondWith({ status: 401, body: errorBody });
    return provider.executeTest(async (mock) => {
      const failure = await asApp(() => api.listOrders("key-does-not-exist"), mock.url).catch((e) => e);
      expect(failure.status).toBe(401);
    });
  });

  it("one of the buyer's orders", () => {
    provider
      .given("the buyer has an order")
      .uponReceiving("a request for one of the buyer's orders")
      .withRequest({
        method: "GET",
        path: fromProviderState("/orders/${orderId}", "/orders/1"),
        headers: { "X-API-Key": BUYER, Accept: "application/json" },
      })
      .willRespondWith({ status: 200, body: order });
    return provider.executeTest(async (mock) => {
      const found = await asApp(() => api.getOrder(1, BUYER), mock.url);
      expect(found.id).toBe(1);
    });
  });

  it("a 404, not someone else's order", () => {
    provider
      .given("the buyer has an order")
      .uponReceiving("a request from another buyer for that order")
      .withRequest({
        method: "GET",
        path: fromProviderState("/orders/${orderId}", "/orders/1"),
        headers: { "X-API-Key": OTHER_BUYER, Accept: "application/json" },
      })
      .willRespondWith({ status: 404, body: errorBody });
    return provider.executeTest(async (mock) => {
      const failure = await asApp(() => api.getOrder(1, OTHER_BUYER), mock.url).catch((e) => e);
      expect(failure.status).toBe(404);
    });
  });
});

