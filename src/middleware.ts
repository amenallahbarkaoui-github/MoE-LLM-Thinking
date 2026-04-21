import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

/** Comma-separated allowed origins. Falls back to same-origin only. */
const ALLOWED_ORIGINS: string[] = (
  process.env.ALLOWED_ORIGINS ?? ""
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Evict stale entries every 5 minutes to prevent memory leaks. */
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function cleanupStore(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    );
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

function isRateLimited(ip: string): {
  limited: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  cleanupStore(now);

  let entry = rateLimitStore.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(ip, entry);
  }

  // Slide the window – keep only timestamps within the current window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
    return {
      limited: true,
      remaining: 0,
      resetMs,
    };
  }

  entry.timestamps.push(now);
  return {
    limited: false,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.timestamps.length,
    resetMs: RATE_LIMIT_WINDOW_MS,
  };
}

// ---------------------------------------------------------------------------
// Origin validation helpers
// ---------------------------------------------------------------------------

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

function isOriginAllowed(origin: string | null, req: NextRequest): boolean {
  // No origin header (e.g. same-origin fetch, server-to-server) – allow
  if (!origin) return true;

  // If explicit allow-list is configured, check it
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // Default: same-origin only – compare origin to the request host
  try {
    const requestOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    return origin === requestOrigin;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

function applyCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  const effectiveOrigin =
    origin && ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : "";

  if (effectiveOrigin) {
    response.headers.set("Access-Control-Allow-Origin", effectiveOrigin);
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  return response;
}

function applyCspHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

// ---------------------------------------------------------------------------
// Middleware entry point
// ---------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  // ---- Preflight (OPTIONS) ------------------------------------------------
  if (req.method === "OPTIONS") {
    const preflightRes = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflightRes, origin);
    return preflightRes;
  }

  // ---- Origin validation ---------------------------------------------------
  if (!isOriginAllowed(origin, req)) {
    return NextResponse.json(
      { error: "Forbidden: origin not allowed" },
      { status: 403 },
    );
  }

  // ---- Rate limiting -------------------------------------------------------
  const ip = getClientIp(req);
  const { limited, remaining, resetMs } = isRateLimited(ip);

  if (limited) {
    const res = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(Math.ceil(resetMs / 1000)));
    res.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
    res.headers.set("X-RateLimit-Remaining", "0");
    applyCorsHeaders(res, origin);
    applyCspHeaders(res);
    return res;
  }

  // ---- Continue to route handler -------------------------------------------
  const response = NextResponse.next();

  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));

  applyCorsHeaders(response, origin);
  applyCspHeaders(response);

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: "/api/:path*",
};
