import type { Seat } from "../api/client";
import { formatCents } from "../lib/format";
import { groupByRow } from "../lib/selection";

type Props = {
  seats: readonly Seat[];
  /** Seats already sold. Shown greyed out in place, so rows keep their shape. */
  sold?: readonly Seat[];
  selected: readonly number[];
  onToggle: (seatId: number) => void;
};

const seatNumber = (seat: Seat) => Number(seat.label.split("-")[1] ?? Number.NaN);

/** Seats by row: available ones are toggle buttons, sold ones are greyed out and can't be picked. */
export function SeatMap({ seats, sold = [], selected, onToggle }: Props) {
  if (seats.length === 0) {
    return <p>No seats are available for this event.</p>;
  }
  const chosen = new Set(selected);
  const soldIds = new Set(sold.map((seat) => seat.id));
  const availableIds = new Set(seats.map((seat) => seat.id));
  const all = [...seats, ...sold.filter((seat) => !availableIds.has(seat.id))].sort(
    (a, b) => (seatNumber(a) || 0) - (seatNumber(b) || 0),
  );
  return (
    <div className="seat-map" data-testid="seat-map">
      <ul className="seat-legend" aria-label="Seat key">
        <li>
          <span className="seat-swatch available" aria-hidden="true" />
          Available
        </li>
        <li>
          <span className="seat-swatch selected" aria-hidden="true" />
          Selected
        </li>
        <li>
          <span className="seat-swatch sold" aria-hidden="true" />
          Sold
        </li>
      </ul>
      <div className="stage" aria-hidden="true">
        Stage
      </div>
      {[...groupByRow(all)].map(([row, rowSeats]) => (
        <fieldset key={row} className="seat-row">
          <legend>Row {row.replace(/^R/, "")}</legend>
          {rowSeats.map((seat) =>
            soldIds.has(seat.id) ? (
              <span
                key={seat.id}
                role="img"
                className="seat sold"
                aria-label={`Seat ${seat.label}, sold`}
                data-testid={`seat-${seat.label}`}
              >
                {seat.label.split("-")[1] ?? seat.label}
              </span>
            ) : (
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
            ),
          )}
        </fieldset>
      ))}
    </div>
  );
}
