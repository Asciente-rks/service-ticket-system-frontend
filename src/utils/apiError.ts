/**
 * Extracts a human-readable, specific message from an API error.
 * The backend validator returns { message: "Input validation failed", errors: [{ path, message }] };
 * this surfaces the specific field messages (e.g. "Status is required") instead of the generic one.
 */
export function getApiErrorMessage(err: any, fallback = "Something went wrong. Please try again."): string {
  const data = err?.response?.data;
  if (data) {
    if (Array.isArray(data.errors) && data.errors.length) {
      const msgs = data.errors
        .map((e: any) => (e && typeof e.message === "string" ? e.message : null))
        .filter(Boolean);
      if (msgs.length) return msgs.join(" · ");
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (err?.message && !String(err.message).includes("Network Error")) return err.message;
  return fallback;
}
