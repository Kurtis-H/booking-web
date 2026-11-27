import { ApiError, RequestTimeoutError } from "../api/client";

/** Turn an order failure into something a buyer can act on. */
export function orderErrorMessage(error: unknown): string {
  // No answer, or the service failed partway: the order may have been saved.
  if (error instanceof RequestTimeoutError) {
    return "We didn't hear back from the booking service, so we can't tell whether your order went through. Check My orders before trying again.";
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return "Someone just took one of those seats. The seat map has been refreshed, so please pick again.";
      case 404:
        return "One of those seats no longer exists. The seat map has been refreshed.";
      case 401:
        return "Your session has ended. Please sign in again.";
      case 503:
        return "The booking service is unavailable right now. Check My orders before trying again, in case your order went through.";
      case 429:
        return error.retryAfterSeconds
          ? `Too many requests. Please wait ${error.retryAfterSeconds} seconds and try again.`
          : "Too many requests. Please wait a moment and try again.";
    }
  }
  return "Something went wrong placing your order. Please try again.";
}

/** General message for failed page loads. */
export function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return "We couldn't find that.";
  if (error instanceof RequestTimeoutError) {
    return "We couldn't load this: the booking service took too long to answer. Please refresh to try again.";
  }
  return "We couldn't load this right now. Please refresh to try again.";
}
