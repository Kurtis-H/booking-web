import { loadErrorMessage } from "../lib/errors";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="muted">
      {label}
    </p>
  );
}

export function LoadError({ error }: { error: unknown }) {
  return (
    <p role="alert" className="error">
      {loadErrorMessage(error)}
    </p>
  );
}
