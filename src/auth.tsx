import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "./api/client";

// The booking API identifies buyers by API key. The demo keys are public test data.
const STORAGE_KEY = "booking.apiKey";

type Auth = {
  apiKey: string | null;
  signIn: (key: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<Auth | null>(null);

function readStoredKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(readStoredKey);

  const signIn = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) throw new Error("Enter an API key.");
    try {
      await api.listOrders(trimmed); // a cheap call that needs a valid key
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new Error("That API key wasn't recognized.");
      }
      throw new Error("We couldn't reach the booking service. Please try again.");
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      // Private mode: stay signed in for this page only.
    }
    setApiKey(trimmed);
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setApiKey(null);
  }, []);

  const value = useMemo(() => ({ apiKey, signIn, signOut }), [apiKey, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
