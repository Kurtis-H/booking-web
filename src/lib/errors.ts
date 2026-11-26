import { ApiError } from "../api/client";

/** Turn an order failure into something a buyer can act on. */
export function orderErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return "Someone just took one of those seats. The seat map has been refreshed, so please pick again.";
      case 404:
        return "One of those seats no longer exists. The seat map has been refreshed.";
      case 401:
        return "Your session has ended. Please sign in again.";
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
  return "We couldn't load this right now. Please refresh to try again.";
}
