import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { DateBadge } from "../components/DateBadge";
import { LoadError, Loading } from "../components/Status";
import { hueClass } from "../lib/eventStyle";
import { formatCents, formatDateTime, pluralize } from "../lib/format";

export function OrdersPage() {
  const { apiKey } = useAuth();
  const orders = useQuery({
    queryKey: ["orders", apiKey],
    queryFn: ({ signal }) => api.listOrders(apiKey ?? "", signal),
    enabled: Boolean(apiKey),
  });

  if (!apiKey) return <Navigate to="/signin?next=/orders" replace />;
  if (orders.isPending) return <Loading label="Loading your orders…" />;
  if (orders.isError) return <LoadError error={orders.error} />;

  return (
    <>
      <section className="intro">
        <h1>My orders</h1>
        <p className="muted">Every order you've placed, newest first.</p>
      </section>
      {orders.data.items.length === 0 ? (
        <p>
          You haven't bought anything yet. <Link to="/">Browse events</Link>.
        </p>
      ) : (
        <ul className="order-list">
          {orders.data.items.map((order) => (
            <li key={order.id} className="card order-card" data-testid="order-row">
              <div>
                <Link to={`/orders/${order.id}`} className="stretched order-link">
                  Order #{order.id}
                </Link>
                <p className="muted">
                  {pluralize(order.items.length, "seat")}: {order.items.map((i) => i.label).join(", ")}
                </p>
                <p className="muted small">Placed {formatDateTime(order.created_at)}</p>
              </div>
              <p className="order-amount">{formatCents(order.total_cents)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function OrderPage() {
  const orderId = Number(useParams().orderId);
  const { apiKey } = useAuth();
  const location = useLocation();
  const state = location.state as {
    justBought?: boolean;
    event?: { id: number; name: string; venue: string; starts_at: string };
  } | null;
  const justBought = Boolean(state?.justBought);
  const event = state?.event;

  const order = useQuery({
    queryKey: ["orders", apiKey, orderId],
    queryFn: ({ signal }) => api.getOrder(orderId, apiKey ?? "", signal),
    enabled: Boolean(apiKey) && Number.isInteger(orderId),
  });

  if (!apiKey) return <Navigate to={`/signin?next=/orders/${orderId}`} replace />;
  if (order.isPending) return <Loading label="Loading order…" />;
  if (order.isError) return <LoadError error={order.error} />;

  return (
    <>
      {justBought && (
        <p role="status" className="success" data-testid="order-confirmation">
          <svg className="success-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
          Thanks! Your order is confirmed.
        </p>
      )}
      <article className="ticket">
        {event && (
          <div className={`ticket-band ${hueClass(event.id)}`}>
            <DateBadge iso={event.starts_at} />
            <div>
              <p className="ticket-event">{event.name}</p>
              <p className="ticket-meta">
                {event.venue} · {formatDateTime(event.starts_at)}
              </p>
            </div>
          </div>
        )}
        <div className="ticket-body">
          <h1>Order #{order.data.id}</h1>
          <p className="muted">Placed {formatDateTime(order.data.created_at)}</p>
      <table className="order-table">
        <caption className="visually-hidden">Seats in this order</caption>
        <thead>
          <tr>
            <th scope="col">Seat</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.data.items.map((item) => (
            <tr key={item.seat_id}>
              <td>{item.label}</td>
              <td>{formatCents(item.price_cents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td data-testid="order-detail-total">{formatCents(order.data.total_cents)}</td>
          </tr>
        </tfoot>
      </table>
        </div>
      </article>
      <p className="after-ticket">
        <Link to="/orders">All my orders</Link> <Link to="/">Find another event</Link>
      </p>
    </>
  );
}
