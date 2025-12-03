import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis();
  }

  // OTP সেভ করা (৫ মিনিট TTL)
  async setOtp(email: string, otp: string): Promise<void> {
    await this.redis.setex(`otp:${email}`, 300, otp); // 300 sec = 5 min
  }

  async getOtp(email: string): Promise<string | null> {
    return this.redis.get(`otp:${email}`);
  }

  async deleteOtp(email: string): Promise<void> {
    await this.redis.del(`otp:${email}`);
  }

  // Rate limiting (এক ইমেইলে ১ মিনিটে ৩ বারের বেশি OTP না)
  async incrementOtpCount(email: string): Promise<number> {
    const key = `otp_count:${email}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60); // ১ মিনিট
    return count;
  }
}
