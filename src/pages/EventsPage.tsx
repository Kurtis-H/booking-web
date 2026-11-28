import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { api } from "../api/client";
import { DateBadge } from "../components/DateBadge";
import { LoadError, Loading } from "../components/Status";
import { dateParts, hueClass } from "../lib/eventStyle";
import { formatDateTime, pluralize } from "../lib/format";

export const EVENTS_PER_PAGE = 12;

export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const offset = (page - 1) * EVENTS_PER_PAGE;

  const events = useQuery({
    queryKey: ["events", page],
    queryFn: ({ signal }) => api.listEvents(EVENTS_PER_PAGE, offset, signal),
    placeholderData: keepPreviousData,
  });

  if (events.isPending) return <Loading label="Loading events…" />;
  if (events.isError) return <LoadError error={events.error} />;

  const { items, total } = events.data;
  const pages = Math.max(1, Math.ceil(total / EVENTS_PER_PAGE));
  const goTo = (next: number) => setParams(next === 1 ? {} : { page: String(next) });

  return (
    <>
      <section className="intro">
        <h1>Upcoming events</h1>
        <p className="muted">Pick a show, choose your seats on the map, and you're done in under a minute.</p>
      </section>
      {items.length === 0 ? (
        <p>No events on this page.</p>
      ) : (
        <ul className="event-grid">
          {items.map((event) => {
            const when = dateParts(event.starts_at);
            const soldOut = event.available_seats === 0;
            return (
              <li key={event.id} className="card event-card" data-testid="event-card">
                <div className={`event-band ${hueClass(event.id)}`}>
                  <DateBadge iso={event.starts_at} />
                  <span className="event-band-when" aria-hidden="true">
                    {when.weekday}, {when.time}
                  </span>
                </div>
                <div className="event-body">
                  <h2>
                    <Link to={`/events/${event.id}`} className="stretched">
                      {event.name}
                    </Link>
                  </h2>
                  <p className="muted">{event.venue}</p>
                  <p className="event-date">{formatDateTime(event.starts_at)}</p>
                  <p className={soldOut ? "chip sold-out" : "chip"}>
                    {soldOut ? "Sold out" : `${pluralize(event.available_seats, "seat")} left`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <nav className="pager" aria-label="Event pages">
        <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span aria-live="polite">
          Page {page} of {pages}
        </span>
        <button type="button" onClick={() => goTo(page + 1)} disabled={page >= pages}>
          Next
        </button>
      </nav>
    </>
  );
}
