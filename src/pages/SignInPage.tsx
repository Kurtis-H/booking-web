import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth";

export const DEMO_KEY = "key-user-1";

/** Only follow redirects to paths inside this app. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const attempt = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await signIn(value);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void attempt(key);
  };

  return (
    <>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} className="card form" noValidate>
        <label htmlFor="api-key">API key</label>
        <input
          id="api-key"
          name="api-key"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signin-error" : undefined}
        />
        {error && (
          <p id="signin-error" role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted">
        This is a demo of the booking API. You can sign in as a test buyer:{" "}
        <button type="button" className="link-button" onClick={() => void attempt(DEMO_KEY)}>
          use the demo account
        </button>
        .
      </p>
    </>
  );
}
