/** How an event looks: its color band and its ticket-style date. Pure, so it's easy to test. */

export const HUES = 6;

/** Every event keeps the same color everywhere: on its card, its page and its ticket. */
export function hueClass(eventId: number): string {
  return `hue-${((eventId % HUES) + HUES) % HUES}`;
}

export type DateParts = { month: string; day: string; weekday: string; time: string };

/** "2027-01-15T19:30:00-07:00" -> { month: "Jan", day: "15", weekday: "Fri", time: "7:30 PM" }. */
export function dateParts(iso: string, timeZone?: string): DateParts {
  const date = new Date(iso);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date);
  return {
    month: part({ month: "short" }),
    day: part({ day: "numeric" }),
    weekday: part({ weekday: "short" }),
    time: part({ hour: "numeric", minute: "2-digit" }),
  };
}

/** The share of seats still for sale, 0 to 100, for the availability meter. */
export function percentLeft(available: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((100 * available) / total);
}
