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
        const host = config.get<string>('REDIS_HOST');
        const port = config.get<number>('REDIS_PORT');
        const password = config.get<string>('REDIS_PASSWORD') || '';
        const db = Number(config.get('REDIS_DB') ?? 0);
        const useTls =
          String(config.get('REDIS_TLS') ?? 'true').toLowerCase() === 'true';
        const prefix = config.get<string>('REDIS_PREFIX') ?? 'app:';
        const ttlSeconds = Number(config.get('CACHE_TTL') ?? 7200);

        // Correct protocol
        const protocol = useTls ? 'redis' : 'redis';
        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const redisUrl = `${protocol}://${auth}${host}:${port}/${db}`;

        const redisStore = new KeyvRedis(redisUrl, { namespace: prefix });

        redisStore.on('error', (err) => {
          console.error('Redis connection error', err);
        });

        const store = new Keyv({ store: redisStore });

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
