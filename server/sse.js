/**
 * Minimal Server-Sent Events helpers for streaming agent output.
 */

export function initSse(res) {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
}

export const formatSseEvent = (event) => `data: ${JSON.stringify(event)}\n\n`;

export function sendSse(res, event) {
  if (!res.writableEnded) res.write(formatSseEvent(event));
}

/** Keeps proxies from closing idle streams while the model is thinking. */
export function startHeartbeat(res, ms = 15000) {
  const timer = setInterval(() => {
    if (!res.writableEnded) res.write(": ping\n\n");
  }, ms);
  return () => clearInterval(timer);
}
