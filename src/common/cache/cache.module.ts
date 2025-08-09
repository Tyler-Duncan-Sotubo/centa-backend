// src/cache/cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheService } from './cache.service';
import { AnnouncementCacheService } from './announcement-cache.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST');
        const port = config.get<number>('REDIS_PORT');
        const password = config.get<string>('REDIS_PASSWORD') || '';
        const db = Number(config.get('REDIS_DB') ?? 0);
        const useTls =
          String(config.get('REDIS_TLS') ?? 'true').toLowerCase() === 'true'; // Redis Cloud often needs TLS
        const prefix = config.get<string>('REDIS_PREFIX') ?? 'app:';
        const ttlSeconds = Number(config.get('CACHE_TTL') ?? 7200);

        const proto = useTls ? 'redis' : 'redis';
        // No username: use :password@
        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const redisUrl = `${proto}://${auth}${host}:${port}/${db}`;

        const store = new Keyv({
          store: new KeyvRedis(redisUrl, { namespace: prefix }),
        });

        return {
          // cache-manager v6: Keyv stores array + TTL in **milliseconds**
          stores: [store],
          ttl: ttlSeconds * 1000,
        };
      },
    }),
  ],
  providers: [CacheService, AnnouncementCacheService],
  exports: [NestCacheModule, CacheService, AnnouncementCacheService],
})
export class CacheModule {}
