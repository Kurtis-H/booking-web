import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { db } from "../test/fakeApi";
import { renderApp } from "../test/render";
import { server } from "../test/setup";

describe("EventsPage", () => {
  it("shows the first page of events with seat counts", async () => {
    renderApp("/");
    const cards = await screen.findAllByTestId("event-card");
    expect(cards).toHaveLength(12);
    expect(within(cards[0]!).getByRole("link", { name: "Event 1" })).toHaveAttribute(
      "href",
      "/events/1",
    );
    expect(cards[0]).toHaveTextContent("24 seats left");
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("pages forward and back", async () => {
    const { user } = renderApp("/");
    await screen.findByText("Page 1 of 3");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("link", { name: "Event 13" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getAllByTestId("event-card")).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("opens straight onto a page from the URL", async () => {
    renderApp("/?page=2");
    expect(await screen.findByRole("link", { name: "Event 13" })).toBeInTheDocument();
  });

  it("shows sold-out events", async () => {
    db.seats.get(1)!.forEach((s) => (s.status = "sold"));
    renderApp("/");
    const cards = await screen.findAllByTestId("event-card");
    expect(cards[0]).toHaveTextContent("Sold out");
  });

  it("explains when events can't load", async () => {
    server.use(http.get("*/api/events", () => HttpResponse.json({}, { status: 500 })));
    renderApp("/");
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load/i);
  });
});
