interface RateLimit {
    count: number;
    resetTime: number;
  }
  
  const RATE_LIMIT = 60; // Requests per minute
  const WINDOW_MS = 60 * 1000; // 1 minute window
  
  export class RateLimiter {
    private static instance: RateLimiter;
    private limits: Map<string, RateLimit>;
  
    private constructor() {
      this.limits = new Map();
    }
  
    static getInstance(): RateLimiter {
      if (!RateLimiter.instance) {
        RateLimiter.instance = new RateLimiter();
      }
      return RateLimiter.instance;
    }
  
    canMakeRequest(userId: string): boolean {
      const now = Date.now();
      const userLimit = this.limits.get(userId);
  
      if (!userLimit || now > userLimit.resetTime) {
        // Reset counter if window expired
        this.limits.set(userId, {
          count: 1,
          resetTime: now + WINDOW_MS
        });
        return true;
      }
  
      if (userLimit.count >= RATE_LIMIT) {
        return false;
      }
  
      userLimit.count++;
      return true;
    }
  
    getRemainingRequests(userId: string): number {
      const userLimit = this.limits.get(userId);
      if (!userLimit || Date.now() > userLimit.resetTime) {
        return RATE_LIMIT;
      }
      return Math.max(0, RATE_LIMIT - userLimit.count);
    }
  }