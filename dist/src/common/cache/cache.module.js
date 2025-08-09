"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const keyv_1 = require("keyv");
const redis_1 = require("@keyv/redis");
const cache_service_1 = require("./cache.service");
const announcement_cache_service_1 = require("./announcement-cache.service");
let CacheModule = class CacheModule {
};
exports.CacheModule = CacheModule;
exports.CacheModule = CacheModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (config) => {
                    const host = config.get('REDIS_HOST');
                    const port = config.get('REDIS_PORT');
                    const password = config.get('REDIS_PASSWORD') || '';
                    const db = Number(config.get('REDIS_DB') ?? 0);
                    const useTls = String(config.get('REDIS_TLS') ?? 'true').toLowerCase() === 'true';
                    const prefix = config.get('REDIS_PREFIX') ?? 'app:';
                    const ttlSeconds = Number(config.get('CACHE_TTL') ?? 7200);
                    const proto = useTls ? 'redis' : 'redis';
                    const auth = password ? `:${encodeURIComponent(password)}@` : '';
                    const redisUrl = `${proto}://${auth}${host}:${port}/${db}`;
                    const store = new keyv_1.default({
                        store: new redis_1.default(redisUrl, { namespace: prefix }),
                    });
                    return {
                        stores: [store],
                        ttl: ttlSeconds * 1000,
                    };
                },
            }),
        ],
        providers: [cache_service_1.CacheService, announcement_cache_service_1.AnnouncementCacheService],
        exports: [cache_manager_1.CacheModule, cache_service_1.CacheService, announcement_cache_service_1.AnnouncementCacheService],
    })
], CacheModule);
//# sourceMappingURL=cache.module.js.map