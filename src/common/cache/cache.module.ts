import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import * as redisStore from 'cache-manager-redis-store';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnnouncementCacheService } from './announcement-cache.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: configService.get<number>('CACHE_TTL'),
        password: configService.get('REDIS_PASSWORD'),
        isGlobal: true,
      }),
    }),
  ],
  providers: [CacheService, AnnouncementCacheService],
  exports: [NestCacheModule, CacheService, AnnouncementCacheService],
})
export class CacheModule {}
