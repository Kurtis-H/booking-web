import type { components } from "./schema";

type Schemas = components["schemas"];
export type EventSummary = Schemas["EventOut"];
export type EventPage = Schemas["EventPage"];
export type Seat = Schemas["SeatOut"];
export type SeatPage = Schemas["SeatPage"];
export type EventStats = Schemas["EventStats"];
export type Order = Schemas["OrderOut"];
export type OrderPage = Schemas["OrderPage"];

/** An error response from the booking API, with the parts the UI needs. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * How long a request may take before the app gives up on it, so a silent
 * API shows an error instead of loading forever (resilience-lab RL-04).
 */
export const REQUEST_TIMEOUT_MS = 10_000;

/** The API didn't answer in time. For an order, the outcome is unknown. */
export class RequestTimeoutError extends Error {
  constructor() {
    super("The booking service took too long to answer.");
    this.name = "RequestTimeoutError";
  }
}

/** Read per request, so the contract tests can point it at Pact's mock server. */
const base = (): string => import.meta.env.VITE_API_BASE ?? "/api";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  apiKey?: string | null;
  signal?: AbortSignal;
  /** Overrides REQUEST_TIMEOUT_MS; for tests. */
  timeoutMs?: number;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.apiKey) headers["X-API-Key"] = options.apiKey;

  const url = new URL(base() + path, window.location.origin);

  // One signal for both reasons to stop: the caller's (a page that's gone)
  // and the time limit, which covers reading the body as well.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) forwardAbort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") message = body.detail;
    else if (Array.isArray(body.detail)) message = "Some of the details sent were not valid.";
  } catch {
    // Not JSON; keep the status text.
  }
  const retryAfter = Number(response.headers.get("Retry-After"));
  return new ApiError(response.status, message, retryAfter > 0 ? retryAfter : undefined);
}

export const api = {
  listEvents: (limit: number, offset: number, signal?: AbortSignal) =>
    request<EventPage>(`/events?limit=${limit}&offset=${offset}`, { signal }),
  getEvent: (id: number, signal?: AbortSignal) => request<EventSummary>(`/events/${id}`, { signal }),
  /** Available seats by default; "sold" lists the taken ones, so the map can show them. */
  listSeats: (
    id: number,
    limit: number,
    offset: number,
    signal?: AbortSignal,
    status: "available" | "sold" = "available",
  ) =>
    request<SeatPage>(
      `/events/${id}/seats?limit=${limit}&offset=${offset}${status === "sold" ? "&status=sold" : ""}`,
      { signal },
    ),
  getStats: (id: number, signal?: AbortSignal) =>
    request<EventStats>(`/events/${id}/stats`, { signal }),
  createOrder: (seatIds: number[], apiKey: string) =>
    request<Order>("/orders", { method: "POST", body: { seat_ids: seatIds }, apiKey }),
  listOrders: (apiKey: string, signal?: AbortSignal) =>
    request<OrderPage>("/orders?limit=50", { apiKey, signal }),
  getOrder: (id: number, apiKey: string, signal?: AbortSignal) =>
    request<Order>(`/orders/${id}`, { apiKey, signal }),
};
