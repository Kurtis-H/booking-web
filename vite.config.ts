/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Content-Security-Policy for the production build (booking-pentest BP-07).
// Everything loads from this origin, and the API is reached through /api on it.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Headers a host must send with the app. frame-ancestors (no framing, so no
// clickjacking) only works as a header, never in a <meta> tag. vite preview
// sends these, and the README lists them for real hosting.
export const SECURITY_HEADERS = {
  "Content-Security-Policy": `${CSP}; frame-ancestors 'none'`,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

// The policy also goes into the built index.html, so it applies wherever the
// files are served. Build only: the dev server injects an inline script for
// hot reload, which this policy would block.
const cspMeta = (): Plugin => ({
  name: "csp-meta",
  apply: "build",
  transformIndexHtml: () => [
    { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" },
  ],
});

// The browser talks to /api; Vite forwards it to the booking API, so the API
// needs no CORS setup in development, preview or the end-to-end tests.
const apiTarget = process.env.API_URL ?? "http://localhost:8000";
const proxy = {
  "/api": {
    target: apiTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ""),
  },
};

export default defineConfig({
  plugins: [react(), cspMeta()],
  server: { proxy },
  preview: { proxy, headers: SECURITY_HEADERS },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx", "src/api/schema.d.ts"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
