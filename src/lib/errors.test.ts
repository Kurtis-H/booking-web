import { describe, expect, it } from "vitest";
import { ApiError, RequestTimeoutError } from "../api/client";
import { loadErrorMessage, orderErrorMessage } from "./errors";

describe("orderErrorMessage", () => {
  it.each([
    [409, /someone just took one of those seats/i],
    [404, /no longer exists/i],
    [401, /sign in again/i],
    [500, /something went wrong/i],
    [503, /check my orders before trying again/i],
  ])("status %i", (status, message) => {
    expect(orderErrorMessage(new ApiError(status, "x"))).toMatch(message);
  });

  it("tells you how long to wait when rate limited", () => {
    expect(orderErrorMessage(new ApiError(429, "x", 7))).toBe(
      "Too many requests. Please wait 7 seconds and try again.",
    );
    expect(orderErrorMessage(new ApiError(429, "x"))).toMatch(/wait a moment/);
  });

  it("handles errors that aren't from the API", () => {
    expect(orderErrorMessage(new TypeError("Failed to fetch"))).toMatch(/something went wrong/i);
  });
});

describe("an order that timed out", () => {
  it("says the outcome is unknown and where to check", () => {
    expect(orderErrorMessage(new RequestTimeoutError())).toMatch(
      /can't tell whether your order went through. Check My orders/,
    );
  });
});

describe("loadErrorMessage", () => {
  it("has a specific message for not found", () => {
    expect(loadErrorMessage(new ApiError(404, "x"))).toBe("We couldn't find that.");
    expect(loadErrorMessage(new Error("boom"))).toMatch(/refresh/);
    expect(loadErrorMessage(new RequestTimeoutError())).toMatch(/couldn't load this: .* too long/);
  });
});
