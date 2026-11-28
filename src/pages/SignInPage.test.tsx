import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/render";
import { safeNext } from "./SignInPage";

describe("SignInPage", () => {
  it("rejects an unknown key", async () => {
    const { user } = renderApp("/signin");
    await user.type(screen.getByLabelText("API key"), "key-nobody");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That API key wasn't recognized.");
    expect(screen.getByLabelText("API key")).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for a key when the box is empty", async () => {
    const { user } = renderApp("/signin");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter an API key.");
  });

  it("signs in and goes back where you came from", async () => {
    const { user } = renderApp("/signin?next=/orders");
    await user.type(screen.getByLabelText("API key"), "key-user-2");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "My orders" })).toBeInTheDocument();
    expect(sessionStorage.getItem("booking.apiKey")).toBe("key-user-2");
  });

  it("has a one-click demo account", async () => {
    const { user } = renderApp("/signin");
    await user.click(screen.getByRole("button", { name: "use the demo account" }));
    expect(await screen.findByRole("heading", { name: "Upcoming events" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My orders" })).toBeInTheDocument();
  });

  it("signs out", async () => {
    const { user } = renderApp("/", { apiKey: "key-user-1" });
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(sessionStorage.getItem("booking.apiKey")).toBeNull();
  });
});

describe("safeNext", () => {
  it.each([
    ["/orders", "/orders"],
    [null, "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
  ])("%s -> %s", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });
});
