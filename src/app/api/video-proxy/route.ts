import { NextRequest } from "next/server";

const CONNECTION_TIMEOUT_MS = 10_000;

/**
 * Video proxy route that relays MJPEG/HTTP streams from IP cameras through
 * the Next.js server. This bypasses browser Mixed Content blocking when the
 * SATS frontend is served over HTTPS but cameras only speak plain HTTP.
 *
 * Uses a custom ReadableStream reader loop instead of piping the upstream
 * body directly — Node.js's internal pipe mechanism applies inactivity
 * timeouts that kill slow/intermittent MJPEG frame streams.
 *
 * Usage: GET /api/video-proxy?url=http://192.168.1.5:8080/video
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing 'url' query parameter", { status: 400 });
  }

  // Time out only the initial connection. Once headers arrive we cancel the
  // timer and start a manual reader loop that never times out on its own.
  const controller = new AbortController();
  const connectionTimer = setTimeout(
    () => controller.abort(),
    CONNECTION_TIMEOUT_MS,
  );

  // Cancel upstream when the browser disconnects.
  request.signal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        Accept: "image/jpeg, image/*, video/*, multipart/x-mixed-replace, */*",
      },
    });
  } catch (err: unknown) {
    clearTimeout(connectionTimer);
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    if (isAbort && request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    return new Response("Failed to connect to camera stream", { status: 502 });
  }

  clearTimeout(connectionTimer);

  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream camera returned ${upstream.status}`, {
      status: 502,
    });
  }

  const contentType =
    upstream.headers.get("content-type") ?? "multipart/x-mixed-replace";

  const reader = upstream.body.getReader();

  // Manual reader loop: pull chunks from the upstream body and enqueue them
  // into a fresh ReadableStream. This avoids Node.js stream-pipe timeouts
  // because each read() call resets the inactivity window.
  const stream = new ReadableStream<Uint8Array>({
    async pull(sinkController) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          sinkController.close();
          return;
        }
        sinkController.enqueue(value);
      } catch {
        sinkController.error(new Error("Upstream stream read failed"));
      }
    },
    cancel() {
      reader.cancel().catch(() => {
        // best-effort cleanup
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
