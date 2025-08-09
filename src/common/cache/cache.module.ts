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
          String(config.get('REDIS_TLS') ?? 'true').toLowerCase() === 'true';

        const proto = useTls ? 'rediss' : 'redis';
        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const url = `${proto}://${auth}${host}:${port}/${db}`;

        // Option A: flat-ish keys "app:cache:<yourKey>"
        const namespace = 'app:cache'; // combine prefix and namespace

        const store = new Keyv({
          store: new KeyvRedis(url), // no keyPrefix option
          namespace, // use combined prefix and namespace
        });

        return {
          stores: [store],
          ttl: (config.get<number>('CACHE_TTL') ?? 7200) * 1000, // ms
        };
      },
    }),
  ],
  providers: [CacheService, AnnouncementCacheService],
  exports: [NestCacheModule, CacheService, AnnouncementCacheService],
})
export class CacheModule {}
