import { expect, test } from "./fixtures";

// booking-pentest BP-07: the built app ships a Content-Security-Policy and
// can't be framed. These tests pin both, and check the policy is strict
// without breaking anything: a whole purchase runs with no violations.

declare global {
  interface Window {
    cspViolations: string[];
  }
}

test("the app is served with a CSP and framing protection", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(await response.text()).toContain('http-equiv="Content-Security-Policy"');
});

test("a whole purchase runs with no CSP violations", async ({ signedInPage: page, newEvent }) => {
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.cspViolations.push(`${e.violatedDirective}: ${e.blockedURI}`),
    );
  });
  const event = await newEvent(2, 3500);
  await page.goto(`/events/${event.id}`);
  await page.getByRole("button", { name: /^Seat S-1,/ }).click();
  await page.getByRole("button", { name: "Buy 1 seat" }).click();
  await expect(page.getByTestId("order-confirmation")).toBeVisible();
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);

  // Control: an inline script is blocked and reported, so an empty list above means something.
  await page.evaluate(() => {
    const script = document.createElement("script");
    script.textContent = "window.inlineRan = true";
    document.body.append(script);
  });
  await expect.poll(() => page.evaluate(() => window.cspViolations.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { inlineRan?: boolean }).inlineRan)).toBeUndefined();
});
