import { NextRequest } from 'next/server';

/**
 * Simple in-memory bridge for external tools (MCP, Cursor skills, Claude Code)
 * to push form data into the running app.
 *
 * POST /api/form - queue a partial form update (requires Bearer token)
 * GET  /api/form - poll & consume the pending update (browser-side, no auth)
 *
 * Security: POST requires Authorization: Bearer <FORM_API_TOKEN>.
 * When FORM_API_TOKEN is not set, POST is rejected (401).
 * GET is unauthenticated because the browser polls it - data only exists
 * after an authenticated POST, so the risk surface is minimal.
 *
 * Single-user tool - one pending update at a time, in-memory only.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pendingUpdate: Record<string, any> | null = null;
let pendingAt: number | null = null;

/** Pending updates expire after 60 seconds */
const EXPIRY_MS = 60_000;

/** Max payload size (100 KB) - reject oversized bodies to prevent memory abuse */
const MAX_PAYLOAD_BYTES = 100_000;

/** Keys that could trigger prototype pollution when spread into objects */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Known top-level form sections - reject anything else */
const ALLOWED_SECTIONS = new Set([
  'personalInfo', 'employment', 'dividends', 'mutualFunds',
  'mortgage', 'spouse', 'childBonus', 'twoPercent',
]);

/**
 * Verify the Bearer token from the Authorization header.
 * Rejects all requests when FORM_API_TOKEN is not configured.
 */
function verifyToken(req: NextRequest): boolean {
  const expected = process.env.FORM_API_TOKEN;
  if (!expected) return false; // no token configured = reject all
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === expected;
}

/**
 * Recursively strip dangerous keys (__proto__, constructor, prototype)
 * from an object tree to prevent prototype pollution attacks.
 */
function sanitize(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = val && typeof val === 'object' && !Array.isArray(val)
      ? sanitize(val) ?? val
      : val;
  }
  return clean;
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

    pendingUpdate = filtered;
    pendingAt = Date.now();
    return Response.json({ ok: true, message: 'Form update queued - the app will pick it up shortly.' });
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function GET() {
  // Expire stale updates
  if (pendingUpdate && pendingAt && Date.now() - pendingAt > EXPIRY_MS) {
    pendingUpdate = null;
    pendingAt = null;
  }

  const data = pendingUpdate;
  // Clear after reading (consume once)
  pendingUpdate = null;
  pendingAt = null;

  return Response.json({ data });
}
