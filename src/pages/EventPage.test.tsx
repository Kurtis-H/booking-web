import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { db, sellBehindTheScenes } from "../test/fakeApi";
import { renderApp } from "../test/render";
import { server } from "../test/setup";

const seatButton = (label: string) =>
  screen.findByRole("button", { name: new RegExp(`^Seat ${label},`) });

describe("EventPage", () => {
  it("shows the event and its seat map", async () => {
    renderApp("/events/1");
    expect(await screen.findByRole("heading", { level: 1, name: "Event 1" })).toBeInTheDocument();
    expect(await seatButton("R1-1")).toHaveAccessibleName("Seat R1-1, $25.00");
    expect(screen.getByRole("group", { name: "Row 2" })).toBeInTheDocument();
  });

  it("lays the venue out in sections, each with its price", async () => {
    renderApp("/events/1");
    const orchestra = await screen.findByRole("region", { name: "Orchestra" });
    const balcony = screen.getByRole("region", { name: "Balcony" });
    expect(within(orchestra).getByText("$25.00")).toBeInTheDocument();
    expect(within(orchestra).getByRole("group", { name: "Row 1" })).toBeInTheDocument();
    expect(within(balcony).getByRole("group", { name: "Row 2" })).toBeInTheDocument();
    expect(within(balcony).getByRole("button", { name: "Seat R2-1, $30.00" })).toBeInTheDocument();
  });

  it("names the section of each seat in the order", async () => {
    const { user } = renderApp("/events/1", { apiKey: "key-user-1" });
    await user.click(await seatButton("R2-1"));
    expect(within(screen.getByTestId("order-summary")).getByRole("listitem")).toHaveTextContent(
      "Seat R2-1 · Balcony · $30.00",
    );
  });

  it("leaves out the section heading for a plain block of seats", async () => {
    for (const seat of db.seats.get(1) ?? []) seat.section = "General";
    renderApp("/events/1");
    await seatButton("R1-1");
    expect(screen.queryByRole("region", { name: "General" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("adds up the seats you pick", async () => {
    const { user } = renderApp("/events/1", { apiKey: "key-user-1" });
    await user.click(await seatButton("R1-1"));
    await user.click(await seatButton("R2-1"));
    expect(screen.getByTestId("order-total")).toHaveTextContent("$55.00");
    expect(await seatButton("R1-1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Buy 2 seats" })).toBeEnabled();

    await user.click(await seatButton("R1-1"));
    expect(screen.getByTestId("order-total")).toHaveTextContent("$30.00");
  });

  it("stops at 10 seats and says why", async () => {
    const { user } = renderApp("/events/1", { apiKey: "key-user-1" });
    for (let n = 1; n <= 11; n++) await user.click(await seatButton(`R1-${n}`));
    expect(screen.getByRole("alert")).toHaveTextContent("You can buy up to 10 seats in one order.");
    expect(screen.getByRole("button", { name: "Buy 10 seats" })).toBeInTheDocument();
  });

  it("asks you to sign in before buying", async () => {
    renderApp("/events/1");
    const link = await screen.findByRole("link", { name: "Sign in to buy" });
    expect(link).toHaveAttribute("href", "/signin?next=/events/1");
  });

  it("buys seats and shows the confirmation", async () => {
    const { user } = renderApp("/events/2", { apiKey: "key-user-1" });
    await user.click(await seatButton("R1-3"));
    await user.click(screen.getByRole("button", { name: "Buy 1 seat" }));

    expect(await screen.findByTestId("order-confirmation")).toHaveTextContent("confirmed");
    expect(screen.getByRole("heading", { name: "Order #1" })).toBeInTheDocument();
    expect(screen.getByTestId("order-detail-total")).toHaveTextContent("$25.00");
    expect(db.orders).toHaveLength(1);
  });

  it("recovers when someone else takes your seat first", async () => {
    const { user } = renderApp("/events/1", { apiKey: "key-user-1" });
    const taken = await seatButton("R1-1");
    await user.click(taken);
    sellBehindTheScenes(1);

    await user.click(screen.getByRole("button", { name: "Buy 1 seat" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/someone just took/i);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Seat R1-1,/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("order-total")).toHaveTextContent("$0.00");
    expect(db.orders).toHaveLength(0);
    // The lost seat stays on the map, greyed out, instead of leaving a gap.
    expect(await screen.findByRole("img", { name: "Seat R1-1, sold" })).toBeInTheDocument();
  });

  it("shows sold seats in place, and they can't be picked", async () => {
    sellBehindTheScenes(2);
    const { user } = renderApp("/events/1", { apiKey: "key-user-1" });
    const sold = await screen.findByRole("img", { name: "Seat R1-2, sold" });
    expect(screen.queryByRole("button", { name: /^Seat R1-2,/ })).not.toBeInTheDocument();
    await user.click(sold);
    expect(screen.getByTestId("order-total")).toHaveTextContent("$0.00");
    // Seats keep their order along the row: 1, then the sold 2, then 3.
    const row = screen.getByTestId("seat-map");
    const order = [...row.querySelectorAll(".seat")].slice(0, 3).map((el) => el.textContent);
    expect(order).toEqual(["1", "✕", "3"]);
    expect(screen.getByRole("list", { name: "Seat key" })).toHaveTextContent("AvailableSelectedSold");
  });

  it("carries the event onto the confirmation ticket", async () => {
    const { user } = renderApp("/events/2", { apiKey: "key-user-1" });
    await user.click(await seatButton("R1-3"));
    await user.click(screen.getByRole("button", { name: "Buy 1 seat" }));
    await screen.findByTestId("order-confirmation");
    expect(screen.getByText(db.events[1]!.name, { selector: ".ticket-event" })).toBeInTheDocument();
  });

  it("tells you to wait when rate limited", async () => {
    server.use(
      http.post(
        "*/api/orders",
        () =>
          new HttpResponse(JSON.stringify({ detail: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Retry-After": "3", "Content-Type": "application/json" },
          }),
      ),
    );
    const { user } = renderApp("/events/1", { apiKey: "key-user-1" });
    await user.click(await seatButton("R1-1"));
    await user.click(screen.getByRole("button", { name: "Buy 1 seat" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait 3 seconds");
    // the selection is kept so the buyer can just try again
    expect(screen.getByTestId("order-total")).toHaveTextContent("$25.00");
  });

  it("loads more seats on request", async () => {
    const { resetDb } = await import("../test/fakeApi");
    resetDb({ events: 1, seatsPerEvent: 130 });
    const { user } = renderApp("/events/1");
    await seatButton("R1-1");
    const map = screen.getByTestId("seat-map");
    expect(within(map).getAllByRole("button")).toHaveLength(100);
    await user.click(screen.getByRole("button", { name: "Show more seats" }));
    await waitFor(() => expect(within(map).getAllByRole("button")).toHaveLength(130));
    expect(screen.queryByRole("button", { name: "Show more seats" })).not.toBeInTheDocument();
  });

  it("handles an event that doesn't exist", async () => {
    renderApp("/events/999");
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't find that.");
  });

  it("rejects a bad event id without calling the API", async () => {
    renderApp("/events/abc");
    expect(await screen.findByRole("alert")).toHaveTextContent("That isn't a valid event.");
  });

  it("says when an event has no seats left", async () => {
    db.seats.get(1)!.forEach((s) => (s.status = "sold"));
    renderApp("/events/1");
    expect(await screen.findByText("No seats are available for this event.")).toBeInTheDocument();
  });
});
