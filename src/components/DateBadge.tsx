import { dateParts } from "../lib/eventStyle";

/** A ticket-stub date: month over day. Decorative; the full date is always written out nearby. */
export function DateBadge({ iso }: { iso: string }) {
  const { month, day } = dateParts(iso);
  return (
    <span className="date-badge" aria-hidden="true">
      <span className="date-month">{month}</span>
      <span className="date-day">{day}</span>
    </span>
  );
}
