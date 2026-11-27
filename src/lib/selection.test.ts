import { afterEach, describe, expect, it, vi } from "vitest";
import type { Seat } from "../api/client";
import { groupByRow, MAX_SEATS_PER_ORDER, toggleSeat, totalCents } from "./selection";

const seat = (id: number, label: string, price_cents = 1000): Seat => ({
  id,
  label,
  price_cents,
  status: "available",
});

describe("toggleSeat", () => {
  it("adds a seat that isn't selected", () => {
    expect(toggleSeat([1], 2)).toEqual({ selected: [1, 2] });
  });

  it("removes a seat that is selected", () => {
    expect(toggleSeat([1, 2, 3], 2)).toEqual({ selected: [1, 3] });
  });

  it("does not change the list it was given", () => {
    const before = [1];
    toggleSeat(before, 2);
    expect(before).toEqual([1]);
  });

  it("refuses an 11th seat and explains why", () => {
    const ten = Array.from({ length: MAX_SEATS_PER_ORDER }, (_, i) => i + 1);
    const result = toggleSeat(ten, 99);
    expect(result.selected).toEqual(ten);
    expect(result.error).toMatch(/up to 10 seats/);
  });

  it("still lets you unselect when at the limit", () => {
    const ten = Array.from({ length: MAX_SEATS_PER_ORDER }, (_, i) => i + 1);
    expect(toggleSeat(ten, 10).selected).toHaveLength(9);
  });
});

describe("totalCents", () => {
  const seats = [seat(1, "R1-1", 2500), seat(2, "R1-2", 2500), seat(3, "R2-1", 3000)];

  it("adds up the selected seats only", () => {
    expect(totalCents(seats, [1, 3])).toBe(5500);
  });

  it("is zero with nothing selected", () => {
    expect(totalCents(seats, [])).toBe(0);
  });

  it("ignores ids that aren't in the list", () => {
    expect(totalCents(seats, [2, 404])).toBe(2500);
  });
});

describe("groupByRow", () => {
  it("groups by the part before the dash, keeping order", () => {
    const rows = groupByRow([seat(1, "R1-1"), seat(2, "R2-1"), seat(3, "R1-2")]);
    expect([...rows.keys()]).toEqual(["R1", "R2"]);
    expect(rows.get("R1")!.map((s) => s.id)).toEqual([1, 3]);
  });

  it("handles labels without a dash", () => {
    expect([...groupByRow([seat(1, "A")]).keys()]).toEqual(["A"]);
  });
});

describe("the planted bug switch (used by framework-showdown)", () => {
  const seats = [seat(1, "R1-1", 2500), seat(2, "R1-2", 3000)];

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing in a normal build", () => {
    expect(import.meta.env.VITE_PLANTED_BUG).toBeFalsy();
    expect(totalCents(seats, [1, 2])).toBe(5500);
  });

  it("with VITE_PLANTED_BUG=total, the total counts only the first seat", () => {
    vi.stubEnv("VITE_PLANTED_BUG", "total");
    expect(totalCents(seats, [1, 2])).toBe(2500);
    expect(totalCents(seats, [])).toBe(0);
  });

  it("ignores any other value", () => {
    vi.stubEnv("VITE_PLANTED_BUG", "something-else");
    expect(totalCents(seats, [1, 2])).toBe(5500);
  });
});
