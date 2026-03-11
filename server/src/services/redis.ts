import Redis from 'ioredis';

// Redis 클라이언트 생성
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

// 크롤링 결과 캐시 서비스
export const crawlCache = {
  // 캐시 키 생성 (상품명 기반)
  _getKey(productName: string): string {
    // 특수문자 제거하고 소문자로
    const sanitized = productName
      .replace(/[^가-힣a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .slice(0, 50);
    return `crawl:${sanitized}`;
  },

  // 캐시 조회
  async get(productName: string): Promise<any[] | null> {
    try {
      const key = this._getKey(productName);
      const data = await redis.get(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`[Redis Cache] HIT: ${productName} (TTL: ${parsed.ttl}s)`);
        return parsed.results;
      }
      
      console.log(`[Redis Cache] MISS: ${productName}`);
      return null;
    } catch (error) {
      console.error('[Redis Cache] Get error:', error);
      return null;
    }
  },

  // 캐시 저장
  async set(productName: string, results: any[], ttlSeconds = 3600): Promise<void> {
    try {
      const key = this._getKey(productName);
      const data = {
        results,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      };
      
      // EX: 초 단위 만료 시간
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      console.log(`[Redis Cache] SET: ${productName} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      console.error('[Redis Cache] Set error:', error);
    }
  },

  // 캐시 삭제
  async delete(productName: string): Promise<void> {
    try {
      const key = this._getKey(productName);
      await redis.del(key);
      console.log(`[Redis Cache] DELETE: ${productName}`);
    } catch (error) {
      console.error('[Redis Cache] Delete error:', error);
    }
  },

  // 캐시 통계
  async getStats(): Promise<{ keys: number; memory: string }> {
    try {
      const info = await redis.info('memory');
      const usedMemory = info.match(/used_memory_human:(.+)/)?.[1]?.trim() || '0B';
      const keys = await redis.keys('crawl:*');
      
      return {
        keys: keys.length,
        memory: usedMemory,
      };
    } catch (error) {
      return { keys: 0, memory: '0B' };
    }
  },
};

// Rate Limiting 서비스
export const rateLimiter = {
  // 요청 횟수 확인 및 증가
  async checkLimit(
    identifier: string,
    maxRequests: number = 10,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await redis.incr(key);
      
      // 첫 요청이면 만료 시간 설정
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      const ttl = await redis.ttl(key);
      const allowed = current <= maxRequests;
      const remaining = Math.max(0, maxRequests - current);
      
      return {
        allowed,
        remaining,
        resetTime: Date.now() + (ttl * 1000),
      };
    } catch (error) {
      // Redis 오류 시 허용
      return { allowed: true, remaining: maxRequests, resetTime: Date.now() + 60000 };
    }
  },
};

// 실시간 알림 Pub/Sub (고급 기능)
export const pubsub = {
  // 채널 구독
  subscribe(channel: string, callback: (message: string) => void) {
    const subscriber = redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
    return subscriber;
  },

  // 메시지 발행
  async publish(channel: string, message: string): Promise<void> {
    await redis.publish(channel, message);
  },
};

export default redis;
