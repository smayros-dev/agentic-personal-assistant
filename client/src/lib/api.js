// API base URL: configurable via VITE_API_URL for production deployments.
// For development (localhost), defaults to http://localhost:3001 for XMLHttpRequest compatibility.
// The Vite proxy only works for regular fetch; XMLHttpRequest (file uploads) need absolute URL.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "");

/** Optional API key (only sent when the user stored one). */
export const getApiKey = () => {
  try {
    return localStorage.getItem("api-key") || "";
  } catch {
    return "";
  }
};

/** fetch() against the API, adding the x-api-key header when configured. */
export function apiFetch(path, init) {
  const url = `${API_BASE}${path}`;
  const apiKey = getApiKey();
  if (!apiKey) return init ? fetch(url, init) : fetch(url);
  return fetch(url, { ...init, headers: { ...init?.headers, "x-api-key": apiKey } });
}

/** Best human-readable message from an API error body (validation errors carry details). */
export const errorMessage = (data, fallback = "Chat request failed") =>
  data?.details?.[0]?.message || data?.error || data?.message || fallback;

/**
 * Splits a Server-Sent Events buffer into complete `data:` events.
 * @returns {{ events: object[], rest: string }} rest is an incomplete trailing chunk
 */
export function parseSseBuffer(buffer) {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events = [];
  for (const part of parts) {
    const data = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data));
    } catch {
      // ignore malformed events
    }
  }
  return { events, rest };
}

/**
 * Streams a chat answer from /api/chat/stream.
 * @param {{ message, sessionId, model, documentId, onEvent, signal }} params
 * @returns {Promise<object>} the final `done` event
 */
export async function streamChat({ onEvent = () => {}, signal, ...body }) {
  const res = await apiFetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(errorMessage(data));
  }
  if (!res.body?.getReader) throw new Error("Streaming not supported");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = null;

  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) {
      onEvent(event);
      if (event.type === "done") done = event;
      if (event.type === "error") throw new Error(event.message || "Chat request failed");
    }
  }

  if (!done) throw new Error("The answer stream ended unexpectedly");
  return done;
}

/** Non-streaming chat request (fallback). */
export async function chatOnce(body) {
  const res = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}
