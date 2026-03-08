interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateBucket>();

export function getRequesterFingerprint(request: Request, fallback: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const realIp = request.headers.get("x-real-ip")?.trim() || "";
  const ip = forwardedFor || realIp;
  return ip || fallback;
}

export function enforceRateLimit(key: string, options: { limit: number; windowMs: number }) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const freshBucket: RateBucket = {
      count: 1,
      resetAt: now + options.windowMs
    };
    rateLimitStore.set(key, freshBucket);
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - freshBucket.count),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000)
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  };
}
