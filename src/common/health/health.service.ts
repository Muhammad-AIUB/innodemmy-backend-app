import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly redis: Redis;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: +(process.env.REDIS_PORT || 6379),
    });
  }

  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        memory: this.checkMemory(),
      },
    };

    const allHealthy = Object.values(checks.checks).every(
      (check) => check.status === 'healthy',
    );

    return {
      ...checks,
      status: allHealthy ? 'ok' : 'degraded',
    };
  }

  async readiness() {
    const dbHealthy = (await this.checkDatabase()).status === 'healthy';
    const redisHealthy = (await this.checkRedis()).status === 'healthy';

    if (dbHealthy && redisHealthy) {
      return { status: 'ready' };
    }

    return {
      status: 'not ready',
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
      },
    };
  }

  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'healthy',
        responseTime: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    return {
      status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
      heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
      usagePercent: `${Math.round(memoryUsagePercent)}%`,
    };
  }
}
