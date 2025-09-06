// CacheModule.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheService } from './cache.service';
import { AnnouncementCacheService } from './announcement-cache.service';
import { CacheVersionCronService } from './cache-version-cron.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST')!;
        const port = Number(config.get('REDIS_PORT') ?? 6379);
        const password = config.get<string>('REDIS_PASSWORD') || '';
        const db = Number(config.get('REDIS_DB') ?? 0);
        const useTls =
          String(config.get('REDIS_TLS') ?? 'true').toLowerCase() === 'true';
        const allowSelfSigned =
          String(config.get('REDIS_SELF_SIGNED') ?? 'true').toLowerCase() ===
          'true'; // dev only
        const prefix = config.get<string>('REDIS_PREFIX') ?? 'app:';
        const ttlSeconds = Number(config.get('CACHE_TTL') ?? 7200);

        // ✅ Use rediss:// for TLS, redis:// otherwise
        const protocol = useTls ? 'redis' : 'redis';
        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const redisUrl = `${protocol}://${auth}${host}:${port}/${db}`;

        /**
         * KeyvRedis forwards options to the underlying Redis client.
         * Different versions may use node-redis or ioredis; both accept TLS-ish flags.
         * We pass both shapes; extra keys are ignored by the other client.
         */
        const tlsish = useTls
          ? {
              // node-redis v4 style:
              socket: {
                tls: true,
                // In dev behind a self-signed proxy, you can relax verification:
                rejectUnauthorized: !allowSelfSigned,
                // friendliness
                keepAlive: 1 << 16,
                reconnectStrategy: (retries: number) =>
                  Math.min(1000, retries * 50),
              },
              // ioredis style:
              tls: { rejectUnauthorized: !allowSelfSigned },
            }
          : {};

        const redisStore = new KeyvRedis(redisUrl, {
          namespace: prefix,
          ...tlsish,
        });

        // Don’t let unhandled 'error' bubble and crash
        redisStore.on('error', (err: unknown) => {
          console.warn('[redis] store error:', err);
        });

        const store = new Keyv({ store: redisStore });
        store.on('error', (err: unknown) => {
          console.warn('[keyv] error:', err);
        });

        return {
          stores: [store],
          ttl: ttlSeconds * 1000,
        };
      },
    }),
  ],
  providers: [CacheService, AnnouncementCacheService, CacheVersionCronService],
  exports: [NestCacheModule, CacheService, AnnouncementCacheService],
})
export class CacheModule {}
