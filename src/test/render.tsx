import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "../App";
import { AuthProvider } from "../auth";

/** Render the whole app at a URL, with a fresh query cache and optional sign-in. */
export function renderApp(url = "/", { apiKey }: { apiKey?: string } = {}) {
  if (apiKey) sessionStorage.setItem("booking.apiKey", apiKey);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { user, queryClient, ...utils };
}
