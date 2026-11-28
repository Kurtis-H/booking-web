import type { Seat } from "../api/client";
import { plantedBug } from "./plantedBug";

/** The API accepts at most 10 seats per order. */
export const MAX_SEATS_PER_ORDER = 10;

export type ToggleResult = { selected: number[]; error?: string };

/**
 * Select or unselect a seat. Selecting beyond the limit leaves the selection
 * unchanged and explains why. The returned list is a new array.
 */
export function toggleSeat(selected: readonly number[], seatId: number): ToggleResult {
  if (selected.includes(seatId)) {
    return { selected: selected.filter((id) => id !== seatId) };
  }
  if (selected.length >= MAX_SEATS_PER_ORDER) {
    return {
      selected: [...selected],
      error: `You can buy up to ${MAX_SEATS_PER_ORDER} seats in one order.`,
    };
  }
  return { selected: [...selected, seatId] };
}

/** Sum the prices of the selected seats. Unknown ids are ignored. */
export function totalCents(seats: readonly Seat[], selected: readonly number[]): number {
  const wanted = new Set(selected);
  if (plantedBug() === "total") {
    // Planted on purpose for test-sensitivity runs; see plantedBug.ts.
    return seats.find((seat) => wanted.has(seat.id))?.price_cents ?? 0;
  }
  return seats.reduce((sum, seat) => (wanted.has(seat.id) ? sum + seat.price_cents : sum), 0);
}

/** Group seats by row: "R3-12" -> row "R3". Keeps the order seats arrive in. */
export function groupByRow(seats: readonly Seat[]): Map<string, Seat[]> {
  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    const row = seat.label.split("-")[0] ?? seat.label;
    const list = rows.get(row);
    if (list) list.push(seat);
    else rows.set(row, [seat]);
  }
  return rows;
}

/**
 * Seats by section (price tier), front to back. Seat ids follow seating order,
 * so sorting by id puts sections, rows and seats in the order a venue has them.
 */
export function groupBySection(seats: readonly Seat[]): Map<string, Seat[]> {
  const sections = new Map<string, Seat[]>();
  for (const seat of [...seats].sort((a, b) => a.id - b.id)) {
    const list = sections.get(seat.section);
    if (list) list.push(seat);
    else sections.set(seat.section, [seat]);
  }
  return sections;
}

/** "$90.00", or "From $25.00" when a section's rows are priced differently. */
export function sectionPrice(seats: readonly Seat[], format: (cents: number) => string): string {
  const prices = seats.map((seat) => seat.price_cents);
  const low = Math.min(...prices);
  return low === Math.max(...prices) ? format(low) : `From ${format(low)}`;
}
