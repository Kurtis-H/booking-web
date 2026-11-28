import { useId } from "react";
import type { Seat } from "../api/client";
import { formatCents } from "../lib/format";
import { groupByRow, groupBySection, sectionPrice } from "../lib/selection";

type Props = {
  seats: readonly Seat[];
  /** Seats already sold. Shown greyed out in place, so rows keep their shape. */
  sold?: readonly Seat[];
  selected: readonly number[];
  onToggle: (seatId: number) => void;
};

/** A plain block of seats has one section, "General", and no section heading. */
const isPlainBlock = (sections: Map<string, Seat[]>) =>
  sections.size === 1 && sections.has("General");

/**
 * The venue, front to back: sections (price tiers) of lettered rows. Available
 * seats are toggle buttons; sold ones are greyed out in place and can't be picked.
 */
export function SeatMap({ seats, sold = [], selected, onToggle }: Props) {
  const id = useId();
  if (seats.length === 0) {
    return <p>No seats are available for this event.</p>;
  }
  const chosen = new Set(selected);
  const soldIds = new Set(sold.map((seat) => seat.id));
  const availableIds = new Set(seats.map((seat) => seat.id));
  const sections = groupBySection([
    ...seats,
    ...sold.filter((seat) => !availableIds.has(seat.id)),
  ]);
  const headed = !isPlainBlock(sections);

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
          <span className="seat-swatch sold" aria-hidden="true">
            ✕
          </span>
          Sold
        </li>
      </ul>
      <div className="stage" aria-hidden="true">
        Stage
      </div>
      {[...sections].map(([name, sectionSeats], tier) => {
        const headingId = `${id}-section-${tier}`;
        return (
          <section
            key={name}
            className={`seat-section tier-${tier % 4}${headed ? " headed" : ""}`}
            aria-labelledby={headed ? headingId : undefined}
            data-testid={`section-${name}`}
          >
            {headed && (
              <header className="seat-section-head">
                <h3 id={headingId}>{name}</h3>
                <p>{sectionPrice(sectionSeats, formatCents)}</p>
              </header>
            )}
            <div className="seat-rows">
              <div className="seat-rows-inner">
            {[...groupByRow(sectionSeats)].map(([row, rowSeats]) => (
              <fieldset key={row} className="seat-row">
                <legend>Row {row.replace(/^R/, "")}</legend>
                {rowSeats.map((seat) => {
                  const number = seat.number ?? seat.label.split("-")[1] ?? seat.label;
                  return soldIds.has(seat.id) ? (
                    <span
                      key={seat.id}
                      role="img"
                      className="seat sold"
                      aria-label={`Seat ${seat.label}, sold`}
                      data-testid={`seat-${seat.label}`}
                    >
                      ✕
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
                      {number}
                    </button>
                  );
                })}
              </fieldset>
            ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
