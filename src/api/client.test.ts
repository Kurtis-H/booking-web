import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/setup";
import { api, ApiError, REQUEST_TIMEOUT_MS, RequestTimeoutError, request } from "./client";

describe("request", () => {
  it("sends the API key and JSON body", async () => {
    let seen: { key: string | null; type: string | null; body: unknown } | undefined;
    server.use(
      http.post("*/api/echo", async ({ request: r }) => {
        seen = {
          key: r.headers.get("X-API-Key"),
          type: r.headers.get("Content-Type"),
          body: await r.json(),
        };
        return HttpResponse.json({ ok: true });
      }),
    );
    await request("/echo", { method: "POST", body: { a: 1 }, apiKey: "k" });
    expect(seen).toEqual({ key: "k", type: "application/json", body: { a: 1 } });
  });

  it("turns the API's error detail into the message", async () => {
    server.use(http.get("*/api/x", () => HttpResponse.json({ detail: "Nope" }, { status: 409 })));
    await expect(request("/x")).rejects.toMatchObject({ status: 409, message: "Nope" });
  });

  it("summarizes validation errors instead of showing raw detail", async () => {
    server.use(
      http.get("*/api/x", () => HttpResponse.json({ detail: [{ loc: ["body"] }] }, { status: 422 })),
    );
    await expect(request("/x")).rejects.toThrow("Some of the details sent were not valid.");
  });

  it("reads Retry-After on 429", async () => {
    server.use(
      http.get(
        "*/api/x",
        () =>
          new HttpResponse(JSON.stringify({ detail: "slow down" }), {
            status: 429,
            headers: { "Retry-After": "12", "Content-Type": "application/json" },
          }),
      ),
    );
    const error = await request("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).retryAfterSeconds).toBe(12);
  });

  it("gives up on an API that doesn't answer", async () => {
    server.use(
      http.get("*/api/x", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const started = Date.now();
    await expect(request("/x", { timeoutMs: 50 })).rejects.toBeInstanceOf(RequestTimeoutError);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("has a time limit by default", () => {
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  it("still lets the caller cancel, which isn't a timeout", async () => {
    server.use(
      http.get("*/api/x", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const pending = request("/x", { signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect((error as Error).name).toBe("AbortError");
  });

  it("copes with an error body that isn't JSON", async () => {
    server.use(http.get("*/api/x", () => new HttpResponse("oops", { status: 502 })));
    await expect(request("/x")).rejects.toMatchObject({ status: 502 });
  });
});

describe("api", () => {
  it("lists events with paging", async () => {
    const page = await api.listEvents(5, 10);
    expect(page.items.map((e) => e.id)).toEqual([11, 12, 13, 14, 15]);
    expect(page.total).toBe(30);
  });
});
