import type { Seat } from "../api/client";
import { formatCents } from "../lib/format";
import { groupByRow } from "../lib/selection";

type Props = {
  seats: readonly Seat[];
  selected: readonly number[];
  onToggle: (seatId: number) => void;
};

/** Available seats grouped by row. Each seat is a toggle button. */
export function SeatMap({ seats, selected, onToggle }: Props) {
  if (seats.length === 0) {
    return <p>No seats are available for this event.</p>;
  }
  const chosen = new Set(selected);
  return (
    <div className="seat-map" data-testid="seat-map">
      {[...groupByRow(seats)].map(([row, rowSeats]) => (
        <fieldset key={row} className="seat-row">
          <legend>Row {row.replace(/^R/, "")}</legend>
          {rowSeats.map((seat) => (
            <button
              key={seat.id}
              type="button"
              className="seat"
              aria-pressed={chosen.has(seat.id)}
              aria-label={`Seat ${seat.label}, ${formatCents(seat.price_cents)}`}
              data-testid={`seat-${seat.label}`}
              onClick={() => onToggle(seat.id)}
            >
              {seat.label.split("-")[1] ?? seat.label}
            </button>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
