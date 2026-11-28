import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth";
import { DateBadge } from "../components/DateBadge";
import { SeatMap } from "../components/SeatMap";
import { LoadError, Loading } from "../components/Status";
import { orderErrorMessage } from "../lib/errors";
import { hueClass, percentLeft } from "../lib/eventStyle";
import { formatCents, formatDateTime, pluralize } from "../lib/format";
import { MAX_SEATS_PER_ORDER, toggleSeat, totalCents } from "../lib/selection";

export const SEATS_PER_PAGE = 100;

export function EventPage() {
  const eventId = Number(useParams().eventId);
  const { apiKey } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const event = useQuery({
    queryKey: ["event", eventId],
    queryFn: ({ signal }) => api.getEvent(eventId, signal),
    enabled: Number.isInteger(eventId) && eventId > 0,
  });

  const seats = useInfiniteQuery({
    queryKey: ["seats", eventId],
    queryFn: ({ pageParam, signal }) => api.listSeats(eventId, SEATS_PER_PAGE, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      last.items.length === SEATS_PER_PAGE ? all.length * SEATS_PER_PAGE : undefined,
    enabled: event.isSuccess,
  });

  // Sold seats too, so the map shows them greyed out instead of leaving gaps.
  const sold = useInfiniteQuery({
    queryKey: ["seats", eventId, "sold"],
    queryFn: ({ pageParam, signal }) =>
      api.listSeats(eventId, SEATS_PER_PAGE, pageParam, signal, "sold"),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      last.items.length === SEATS_PER_PAGE ? all.length * SEATS_PER_PAGE : undefined,
    enabled: event.isSuccess,
  });

  const order = useMutation({
    mutationFn: (seatIds: number[]) => api.createOrder(seatIds, apiKey ?? ""),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["seats", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      const bought = event.data;
      navigate(`/orders/${created.id}`, {
        state: {
          justBought: true,
          event: bought && {
            id: bought.id,
            name: bought.name,
            venue: bought.venue,
            starts_at: bought.starts_at,
          },
        },
      });
    },
    onError: (error) => {
      setNotice(orderErrorMessage(error));
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        setSelected([]);
        void queryClient.invalidateQueries({ queryKey: ["seats", eventId] });
        void queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      }
    },
  });

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return <p role="alert">That isn't a valid event.</p>;
  }
  if (event.isPending) return <Loading label="Loading event…" />;
  if (event.isError) return <LoadError error={event.error} />;

  const allSeats = seats.data?.pages.flatMap((page) => page.items) ?? [];
  const soldSeats = sold.data?.pages.flatMap((page) => page.items) ?? [];
  const total = totalCents(allSeats, selected);
  const capacity = event.data.available_seats + soldSeats.length;
  const prices = allSeats.map((seat) => seat.price_cents);

  const toggle = (seatId: number) => {
    const result = toggleSeat(selected, seatId);
    setSelected(result.selected);
    setNotice(result.error ?? null);
  };

  return (
    <>
      <p className="back">
        <Link to="/">← All events</Link>
      </p>
      <header className={`event-hero ${hueClass(event.data.id)}`}>
        <DateBadge iso={event.data.starts_at} />
        <div className="event-hero-text">
          <h1>{event.data.name}</h1>
          <p className="event-hero-meta">
            {event.data.venue} · {formatDateTime(event.data.starts_at)}
          </p>
          <div className="event-hero-stats">
            <p>{pluralize(event.data.available_seats, "seat")} available</p>
            {prices.length > 0 && <p>From {formatCents(Math.min(...prices))}</p>}
          </div>
          {sold.isSuccess && capacity > 0 && (
            <div
              className="meter"
              role="meter"
              aria-label="Seats still for sale"
              aria-valuemin={0}
              aria-valuemax={capacity}
              aria-valuenow={event.data.available_seats}
            >
              <span className={`meter-fill w-${percentLeft(event.data.available_seats, capacity)}`} />
            </div>
          )}
        </div>
      </header>

      <div className="event-layout">
        <section className="card seat-panel" aria-labelledby="seats-heading">
          <h2 id="seats-heading">Choose your seats</h2>
          <p className="muted">Up to {MAX_SEATS_PER_ORDER} seats per order.</p>
          {seats.isPending && <Loading label="Loading seats…" />}
          {seats.isError && <LoadError error={seats.error} />}
          {seats.isSuccess && (
            <>
              <SeatMap seats={allSeats} sold={soldSeats} selected={selected} onToggle={toggle} />
              {seats.hasNextPage && (
                <button
                  type="button"
                  onClick={() => void seats.fetchNextPage()}
                  disabled={seats.isFetchingNextPage}
                >
                  {seats.isFetchingNextPage ? "Loading…" : "Show more seats"}
                </button>
              )}
            </>
          )}
        </section>

        <aside className="card summary" aria-labelledby="summary-heading" data-testid="order-summary">
          <h2 id="summary-heading">Your order</h2>
          {selected.length === 0 ? (
            <p className="muted">No seats selected yet.</p>
          ) : (
            <ul>
              {allSeats
                .filter((seat) => selected.includes(seat.id))
                .map((seat) => (
                  <li key={seat.id}>
                    Seat {seat.label}
                    {seat.section !== "General" && ` · ${seat.section}`} ·{" "}
                    {formatCents(seat.price_cents)}
                  </li>
                ))}
            </ul>
          )}
          <p className="total">
            Total: <strong data-testid="order-total">{formatCents(total)}</strong>
          </p>
          {notice && (
            <p role="alert" className="error">
              {notice}
            </p>
          )}
          {apiKey ? (
            <button
              type="button"
              className="primary"
              disabled={selected.length === 0 || order.isPending}
              onClick={() => order.mutate(selected)}
            >
              {order.isPending
                ? "Placing order…"
                : selected.length === 0
                  ? "Select seats to buy"
                  : `Buy ${pluralize(selected.length, "seat")}`}
            </button>
          ) : (
            <Link className="button primary" to={`/signin?next=/events/${eventId}`}>
              Sign in to buy
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
