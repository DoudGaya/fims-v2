import { NextResponse } from 'next/server';
import ProductionLogger from './productionLogger';

/**
 * Performance monitoring wrapper for Route Handlers
 * Usage:
 * export const GET = withPerformanceMonitoring(async (req) => { ... });
 */
export function withPerformanceMonitoring(
    handler: (req: Request, ...args: any[]) => Promise<Response>
) {
    return async (req: Request, ...args: any[]) => {
        const startTime = Date.now();
        const method = req.method;
        const url = req.url;

        try {
            const response = await handler(req, ...args);

            const endTime = Date.now();
            const duration = endTime - startTime;
            const status = response.status;

            // Log API performance
            ProductionLogger.api(url, method, status, duration);

            // Log slow requests (>2s)
            if (duration > 2000) {
                ProductionLogger.warn(`Slow API request: ${method} ${url} took ${duration}ms`);
            }

            return response;
        } catch (error: any) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            ProductionLogger.error(`API error in ${method} ${url}`, error);
            ProductionLogger.api(url, method, 500, duration);

            return NextResponse.json(
                {
                    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
                },
                { status: 500 }
            );
        }
    };
}

/**
 * Rate limiting wrapper (Legacy in-memory implementation ported to TS)
 * Note: For serverless, this memory is not shared across instances.
 */
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per window

export function withRateLimit(
    handler: (req: Request, ...args: any[]) => Promise<Response>,
    customLimit = MAX_REQUESTS
) {
    return async (req: Request, ...args: any[]) => {
        // Skip rate limiting in development
        if (process.env.NODE_ENV === 'development') {
            return handler(req, ...args);
        }

        try {
            const ip = req.headers.get('x-forwarded-for') || 'unknown';
            const now = Date.now();
            const windowStart = now - RATE_LIMIT_WINDOW;

            // Clean old entries (optimistic cleanup on request)
            const currentReqs = requestCounts.get(ip) || [];
            const recentRequests = currentReqs.filter(time => time > windowStart);

            if (recentRequests.length >= customLimit) {
                ProductionLogger.warn(`Rate limit exceeded for IP: ${ip}`);
                return NextResponse.json(
                    {
                        error: 'Too many requests',
                        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
                    },
                    { status: 429 }
                );
            }

            // Add current request
            recentRequests.push(now);
            requestCounts.set(ip, recentRequests);

            return handler(req, ...args);
        } catch (e) {
            // If rate limit logic fails, fail open but log
            console.error('Rate limit error:', e);
            return handler(req, ...args);
        }
    };
}

/**
 * Combined wrapper for standard API routes (Performance + RateLimit)
 */
export function withStandardMiddleware(
    handler: (req: Request, ...args: any[]) => Promise<Response>
) {
    return withPerformanceMonitoring(withRateLimit(handler));
}
