/**
 * API Key Authentication Middleware for /api/v1/* public endpoints
 *
 * Usage:
 *   const auth = await requireApiKey(req, 'farmers:read');
 *   if (auth instanceof NextResponse) return auth; // error response
 *   const { apiKey } = auth;
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import prisma from './prisma';
import redis from './redis';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiKeyContext {
  apiKey: {
    id: string;
    keyPrefix: string;
    name: string;
    scopes: string[];
    allowSensitiveFields: boolean;
    rateLimit: number;
  };
}

// ─── Token Utilities ─────────────────────────────────────────────────────────

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a new API token. Returns { token, keyPrefix, keyHash }. */
export function generateApiToken(): {
  token: string;
  keyPrefix: string;
  keyHash: string;
} {
  const { randomBytes } = require('crypto');
  const raw = randomBytes(32).toString('hex'); // 64 hex chars
  const token = `fims_live_${raw}`;
  const keyPrefix = `fims_live_${raw.slice(0, 8)}`; // first 8 chars as display prefix
  const keyHash = hashToken(token);
  return { token, keyPrefix, keyHash };
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const RATE_WINDOW_SECONDS = 60;

/**
 * Sliding-window rate limit using Upstash Redis.
 * Returns true if the request is allowed, false if the limit is exceeded.
 */
async function checkRateLimit(keyPrefix: string, limitPerMinute: number): Promise<boolean> {
  const redisKey = `ratelimit:apikey:${keyPrefix}`;
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_SECONDS * 1000;

  try {
    const pipe = redis.pipeline();
    // Remove timestamps outside the window
    pipe.zremrangebyscore(redisKey, '-inf', windowStart);
    // Count remaining
    pipe.zcard(redisKey);
    // Add current timestamp
    pipe.zadd(redisKey, { score: now, member: `${now}` });
    // Set key expiry to clean up idle keys
    pipe.expire(redisKey, RATE_WINDOW_SECONDS * 2);

    const results = await pipe.exec();
    const count = (results?.[1] as number) ?? 0;
    return count < limitPerMinute;
  } catch {
    // Redis unavailable — fail open (allow request) to prevent outage
    return true;
  }
}

// ─── Usage Logging ───────────────────────────────────────────────────────────

function logUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  ipAddress: string | null
): void {
  // Fire-and-forget — never block the response
  Promise.all([
    prisma.apiKeyUsageLog.create({
      data: { apiKeyId, endpoint, method, statusCode, ipAddress },
    }),
    prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    }),
  ]).catch(() => {
    // Ignore — usage logging must never break the API response
  });
}

// ─── Main Middleware ──────────────────────────────────────────────────────────

/**
 * Authenticate and authorize an incoming public API request.
 *
 * @param req      The incoming NextRequest.
 * @param scope    The scope required for this endpoint (e.g. "farmers:read").
 * @returns        ApiKeyContext on success, or a NextResponse with an error.
 */
export async function requireApiKey(
  req: NextRequest,
  scope: string
): Promise<ApiKeyContext | NextResponse> {
  const method = req.method;
  const endpoint = new URL(req.url).pathname;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    null;

  // ── 1. Extract token from header ──────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');

  let token: string | null = null;

  if (authHeader?.startsWith('Bearer fims_')) {
    token = authHeader.slice(7);
  } else if (apiKeyHeader?.startsWith('fims_')) {
    token = apiKeyHeader;
  }

  if (!token) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message:
          'Missing API key. Provide your token via the Authorization header (Bearer <token>) or X-API-Key header.',
        docs: 'https://fims.cosmopolitan.edu.ng/docs',
      },
      { status: 401 }
    );
  }

  // ── 2. Look up the key by hash ────────────────────────────────────────────
  const keyHash = hashToken(token);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid API key.' },
      { status: 401 }
    );
  }

  // ── 3. Validate status & expiry ───────────────────────────────────────────
  if (!apiKey.isActive) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'This API key has been revoked.' },
      { status: 401 }
    );
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'This API key has expired. Please contact your CCSA administrator to renew access.',
      },
      { status: 401 }
    );
  }

  // ── 4. Check scope ────────────────────────────────────────────────────────
  if (!apiKey.scopes.includes(scope)) {
    logUsage(apiKey.id, endpoint, method, 403, ip);
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: `Your API key does not have the "${scope}" scope required for this endpoint.`,
        yourScopes: apiKey.scopes,
      },
      { status: 403 }
    );
  }

  // ── 5. Rate limiting ──────────────────────────────────────────────────────
  const allowed = await checkRateLimit(apiKey.keyPrefix, apiKey.rateLimit);
  if (!allowed) {
    logUsage(apiKey.id, endpoint, method, 429, ip);
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit of ${apiKey.rateLimit} requests/minute exceeded. Please slow down.`,
        retryAfter: RATE_WINDOW_SECONDS,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(RATE_WINDOW_SECONDS) },
      }
    );
  }

  // ── 6. Log successful auth (async) ────────────────────────────────────────
  logUsage(apiKey.id, endpoint, method, 200, ip);

  return {
    apiKey: {
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      scopes: apiKey.scopes,
      allowSensitiveFields: apiKey.allowSensitiveFields,
      rateLimit: apiKey.rateLimit,
    },
  };
}
