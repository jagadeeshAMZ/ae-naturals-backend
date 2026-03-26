// src/common/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { AppCacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // 1. Try to get the primary connection string (e.g., Upstash)
        let redisUrl = configService.get<string>('REDIS_URL');

        // 2. Fallback to local host/port if URL is missing
        if (!redisUrl) {
          const host = configService.get<string>('REDIS_HOST') || 'localhost';
          const port = configService.get<number>('REDIS_PORT') || 6379;
          redisUrl = `redis://${host}:${port}`;
        }

        return {
          store: await redisStore({
            url: redisUrl,
            // 3. Conditional TLS: Required for Upstash but breaks local Redis
            socket: {
              tls: redisUrl.includes('upstash.io') || redisUrl.startsWith('rediss://'),
            },
            ttl: 600000, // 10 minutes
          }),
        };
      },
    }),
  ],
  providers: [AppCacheService],
  exports: [CacheModule, AppCacheService],
})
export class CommonCacheModule {}