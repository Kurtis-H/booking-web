import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { EventPage } from "./pages/EventPage";
import { EventsPage } from "./pages/EventsPage";
import { OrderPage, OrdersPage } from "./pages/OrdersPage";
import { SignInPage } from "./pages/SignInPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<EventsPage />} />
        <Route path="events/:eventId" element={<EventPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>That page doesn't exist.</p>
    </>
  );
}
