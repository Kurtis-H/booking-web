import { describe, expect, it } from "vitest";
import { dateParts, HUES, hueClass, percentLeft } from "./eventStyle";

describe("hueClass", () => {
  it("gives an event the same color every time, and spreads events across the hues", () => {
    expect(hueClass(7)).toBe(hueClass(7));
    expect(new Set(Array.from({ length: HUES }, (_, i) => hueClass(i + 1))).size).toBe(HUES);
  });

  it("copes with ids outside the usual range", () => {
    expect(hueClass(0)).toBe("hue-0");
    expect(hueClass(-1)).toMatch(/^hue-[0-5]$/);
  });
});

describe("dateParts", () => {
  it("splits a date for the ticket-stub badge", () => {
    expect(dateParts("2027-01-15T19:30:00-07:00", "America/Denver")).toEqual({
      month: "Jan",
      day: "15",
      weekday: "Fri",
      time: "7:30 PM",
    });
  });
});

describe("percentLeft", () => {
  it.each([
    [38, 48, 79],
    [0, 48, 0],
    [48, 48, 100],
    [5, 0, 0],
  ])("%i of %i seats left is %i%%", (available, total, expected) => {
    expect(percentLeft(available, total)).toBe(expected);
  });
});
