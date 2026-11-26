import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { LoadError, Loading } from "../components/Status";
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
      <h1>My orders</h1>
      {orders.data.items.length === 0 ? (
        <p>
          You haven't bought anything yet. <Link to="/">Browse events</Link>.
        </p>
      ) : (
        <ul className="order-list">
          {orders.data.items.map((order) => (
            <li key={order.id} className="card" data-testid="order-row">
              <Link to={`/orders/${order.id}`}>Order #{order.id}</Link> ·{" "}
              {pluralize(order.items.length, "seat")} · {formatCents(order.total_cents)}
              <span className="muted"> · {formatDateTime(order.created_at)}</span>
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
  const justBought = Boolean((location.state as { justBought?: boolean } | null)?.justBought);

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
          Thanks! Your order is confirmed.
        </p>
      )}
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
              <td>#{item.seat_id}</td>
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
      <p>
        <Link to="/orders">All my orders</Link>
      </p>
    </>
  );
}
