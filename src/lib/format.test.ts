import { describe, expect, it } from "vitest";
import { formatCents, formatDateTime, pluralize } from "./format";

describe("formatCents", () => {
  it.each([
    [2500, "$25.00"],
    [0, "$0.00"],
    [5, "$0.05"],
    [123456, "$1,234.56"],
  ])("%i cents is %s", (cents, text) => {
    expect(formatCents(cents)).toBe(text);
  });
});

describe("formatDateTime", () => {
  it("formats in the requested time zone", () => {
    expect(formatDateTime("2027-01-02T19:00:00Z", "UTC")).toBe("Sat, Jan 2, 2027, 7:00 PM");
  });
});

describe("pluralize", () => {
  it.each([
    [0, "0 seats"],
    [1, "1 seat"],
    [2, "2 seats"],
  ])("%i -> %s", (n, text) => {
    expect(pluralize(n, "seat")).toBe(text);
  });
});
