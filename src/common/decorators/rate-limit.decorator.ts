import { RouteConfig } from '@nestjs/platform-fastify';

/**
 * Per-route rate limit override for @fastify/rate-limit.
 * Uses Fastify's native route config to apply rate limiting.
 *
 * @example @RateLimit({ max: 5, timeWindow: '1 minute' })
 */
export const RateLimit = (config: { max: number; timeWindow: string }) =>
  RouteConfig({ rateLimit: config });
