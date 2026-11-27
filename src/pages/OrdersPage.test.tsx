import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { api } from "../api/client";
import { renderApp } from "../test/render";

describe("OrdersPage", () => {
  it("sends signed-out visitors to sign in", async () => {
    renderApp("/orders");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("is empty before you buy anything", async () => {
    renderApp("/orders", { apiKey: "key-user-1" });
    expect(await screen.findByText(/haven't bought anything yet/)).toBeInTheDocument();
  });

  it("lists your orders, newest first, and opens one", async () => {
    await api.createOrder([1], "key-user-1");
    await api.createOrder([2, 3], "key-user-1");
    await api.createOrder([4], "key-user-2"); // someone else's
    const { user } = renderApp("/orders", { apiKey: "key-user-1" });

    const rows = await screen.findAllByTestId("order-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Order #2 · 2 seats · $50.00");

    await user.click(screen.getByRole("link", { name: "Order #1" }));
    expect(await screen.findByRole("heading", { name: "Order #1" })).toBeInTheDocument();
    expect(screen.queryByTestId("order-confirmation")).not.toBeInTheDocument();
  });

  it("names each seat the way the buyer saw it", async () => {
    const order = await api.createOrder([2, 3], "key-user-1");
    renderApp(`/orders/${order.id}`, { apiKey: "key-user-1" });
    const seats = await screen.findAllByRole("row");
    // header, two seats, total
    expect(seats.map((r) => r.textContent)).toEqual(["SeatPrice", "R1-2$25.00", "R1-3$25.00", "Total$50.00"]);
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
  });

  it("won't show someone else's order", async () => {
    await api.createOrder([4], "key-user-2");
    renderApp("/orders/1", { apiKey: "key-user-1" });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't find that.");
  });

  it("sends signed-out visitors from an order page to sign in", async () => {
    renderApp("/orders/1");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("App", () => {
  it("has a not-found page", async () => {
    renderApp("/nope");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
