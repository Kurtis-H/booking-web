const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 2500 -> "$25.00". Prices are kept in whole cents everywhere. */
export function formatCents(cents: number): string {
  return dollars.format(cents / 100);
}

/** A readable date and time. Pass timeZone to make output predictable (tests). */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

/** "1 seat", "3 seats". */
export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
