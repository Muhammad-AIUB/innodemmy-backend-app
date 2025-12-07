import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis();
  }

  async setOtp(email: string, otp: string): Promise<void> {
    await this.redis.setex(`otp:${email}`, 300, otp);
  }

  async getOtp(email: string): Promise<string | null> {
    return this.redis.get(`otp:${email}`);
  }

  async deleteOtp(email: string): Promise<void> {
    await this.redis.del(`otp:${email}`);
  }

  async incrementOtpCount(email: string): Promise<number> {
    const key = `otp_count:${email}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    return count;
  }
}
