import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../auth";

export function Layout() {
  const { apiKey, signOut } = useAuth();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand">
          <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z" />
            <path d="M14 5v14" strokeDasharray="2 2" />
          </svg>
          Booking
        </Link>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Events
          </NavLink>
          {apiKey && <NavLink to="/orders">My orders</NavLink>}
          {apiKey ? (
            <button type="button" className="link-button" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <NavLink to="/signin">Sign in</NavLink>
          )}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          A demo ticketing app, built and tested as part of a QA portfolio. No real tickets are sold.
        </p>
      </footer>
    </>
  );
}
