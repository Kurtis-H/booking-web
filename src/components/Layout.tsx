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
    </>
  );
}
