import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../prisma/prisma.health';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaIndicator: PrismaHealthIndicator,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    console.log(`Checking health status...`);

    return this.health.check([
      // Database Health
      () => this.prismaIndicator.isHealthy('database'),

      // Redis / Cache Health
      async () => {
        try {
          const testKey = `health:${Date.now()}`;

          // IMPORTANT: cache-manager TTL uses milliseconds
          await this.cacheManager.set(testKey, 'pong', 10000);

          const result = await this.cacheManager.get(testKey);

          if (result === 'pong') {
            return { redis: { status: 'up' } };
          }

          throw new Error('Redis response mismatch');
        } catch (e) {
          return {
            redis: {
              status: 'down',
              message: e.message,
            },
          };
        }
      },
    ]);
  }
}