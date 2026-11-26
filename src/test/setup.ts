import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { handlers, resetDb } from "./fakeApi";

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  resetDb();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
