import { NextRequest } from 'next/server';

/**
 * Per-session bridge for external tools (MCP, Cursor skills, Claude Code)
 * to push form data into the running app.
 *
 * POST /api/form - queue a partial form update (requires Bearer <session-token>)
 * GET  /api/form?session=<token> - poll & consume the pending update for this session
 *
 * Security:
 * - Each browser session generates a random UUID token (stored in localStorage).
 * - POST requires Authorization: Bearer <session-token>.
 * - GET requires ?session=<token> query param to scope data retrieval.
 * - Tokens are random UUIDs (128-bit entropy) – practically unguessable.
 * - Pending data expires after 60 seconds and sessions are cleaned up automatically.
 *
 * Multi-user safe: each session token has its own isolated pending update.
 */

interface PendingEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  createdAt: number;
}

/** Pending updates per session token */
const pendingUpdates = new Map<string, PendingEntry>();

/** Pending updates expire after 60 seconds */
const EXPIRY_MS = 60_000;

/** Max concurrent sessions (prevent memory exhaustion) */
const MAX_SESSIONS = 500;

/** Max payload size (100 KB) */
const MAX_PAYLOAD_BYTES = 100_000;

/** Keys that could trigger prototype pollution */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Known top-level form sections */
const ALLOWED_SECTIONS = new Set([
  'personalInfo', 'employment', 'dividends', 'mutualFunds', 'stockSales',
  'mortgage', 'spouse', 'childBonus', 'twoPercent', 'parentAllocation',
]);

/** Clean up expired entries from the map */
function cleanExpired() {
  const now = Date.now();
  for (const [token, entry] of pendingUpdates) {
    if (now - entry.createdAt > EXPIRY_MS) {
      pendingUpdates.delete(token);
    }
  }
}

/** Minimum token length to reject accidentally weak tokens */
const MIN_TOKEN_LENGTH = 8;

/**
 * Extract the Bearer token from the Authorization header.
 * Must be at least MIN_TOKEN_LENGTH characters to prevent weak tokens.
 */
function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length >= MIN_TOKEN_LENGTH ? token : null;
}

/**
 * Recursively strip dangerous keys (__proto__, constructor, prototype)
 * from an object tree - including objects nested inside arrays -
 * to prevent prototype pollution attacks.
 */
function sanitizeValue(val: unknown): unknown {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sanitizeValue);
  const clean: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(val)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = sanitizeValue(v);
  }
  return clean;
}

function sanitize(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  return sanitizeValue(obj) as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) {
    return Response.json(
      { error: 'Missing Authorization: Bearer <session-token>' },
      { status: 401 },
    );
  }

  try {
    // Check content length before parsing
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: 'Payload too large (max 100 KB)' }, { status: 413 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Payload must be a JSON object' }, { status: 400 });
    }

    // Sanitize: strip dangerous keys and reject unknown top-level sections
    const sanitized = sanitize(body);
    if (!sanitized || Object.keys(sanitized).length === 0) {
      return Response.json({ error: 'No valid form sections in payload' }, { status: 400 });
    }

    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(sanitized)) {
      if (ALLOWED_SECTIONS.has(key)) {
        filtered[key] = sanitized[key];
      }
    }
    if (Object.keys(filtered).length === 0) {
      return Response.json(
        { error: `No recognized sections. Allowed: ${[...ALLOWED_SECTIONS].join(', ')}` },
        { status: 400 },
      );
    }

    // Clean expired entries and enforce max sessions
    cleanExpired();
    if (pendingUpdates.size >= MAX_SESSIONS && !pendingUpdates.has(token)) {
      return Response.json(
        { error: 'Too many active sessions. Try again later.' },
        { status: 503 },
      );
    }

    pendingUpdates.set(token, { data: filtered, createdAt: Date.now() });
    return Response.json({ ok: true, message: 'Form update queued - the app will pick it up shortly.' });
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get('session');
  if (!session || session.length < MIN_TOKEN_LENGTH) {
    return Response.json({ data: null });
  }

  // Clean expired entries
  cleanExpired();

  const entry = pendingUpdates.get(session);
  // Clear after reading (consume once)
  pendingUpdates.delete(session);

  return Response.json({ data: entry?.data ?? null });
}
