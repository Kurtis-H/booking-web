/**
 * A deliberate, switchable bug, used to prove that test suites can fail.
 *
 * framework-showdown (github.com/Kurtis-H/framework-showdown) builds this app
 * with VITE_PLANTED_BUG=total and checks that every framework's suite catches
 * it. It's off in every normal build, and the unit tests below make sure the
 * switch does nothing unless it's set.
 *
 * Bugs:
 *   total - the order total counts only the first selected seat.
 */
export function plantedBug(): string | undefined {
  return import.meta.env.VITE_PLANTED_BUG || undefined;
}
