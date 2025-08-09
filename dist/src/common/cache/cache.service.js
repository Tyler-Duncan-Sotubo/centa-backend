"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const cache_manager_1 = require("@nestjs/cache-manager");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CacheService = CacheService_1 = class CacheService {
    constructor(cacheManager, config) {
        this.cacheManager = cacheManager;
        this.config = config;
        this.logger = new common_1.Logger(CacheService_1.name);
        const ttlSeconds = parseInt(this.config.get('CACHE_TTL') ?? '86400', 10);
        this.ttlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 86400 * 1000;
        this.logger.debug(`Cache TTL set to ${this.ttlMs} ms`);
    }
    async getOrSetCache(key, loadFn, opts) {
        const hit = await this.cacheManager.get(key);
        if (hit !== undefined && hit !== null) {
            return hit;
        }
        const data = await loadFn();
        const ttl = opts?.ttlSeconds ? opts.ttlSeconds * 1000 : this.ttlMs;
        await this.cacheManager.set(key, data, ttl);
        return data;
    }
    async get(key) {
        return (await this.cacheManager.get(key)) ?? undefined;
    }
    async set(key, value, options) {
        const ttl = options?.ttlSeconds ? options.ttlSeconds * 1000 : this.ttlMs;
        await this.cacheManager.set(key, value, ttl);
    }
    async del(key) {
        await this.cacheManager.del(key);
    }
    async debugInfo() {
        const anyCache = this.cacheManager;
        const stores = anyCache?.stores ?? (anyCache?.store ? [anyCache.store] : []);
        const first = stores[0];
        const keyv = first && first instanceof Object && 'store' in first ? first : null;
        const keyvStore = keyv?.store ?? null;
        const legacyStore = anyCache?.store;
        const legacyClient = legacyStore?.client;
        const isKeyvRedis = !!keyvStore &&
            (keyvStore.constructor?.name?.toLowerCase().includes('redis') ||
                (typeof keyvStore?.opts?.url === 'string' &&
                    keyvStore.opts.url.startsWith('redis://')));
        const isLegacyRedis = !!legacyClient;
        return {
            mode: stores.length
                ? 'v6-multi-store'
                : legacyClient
                    ? 'legacy-single-store'
                    : 'unknown',
            storeCount: stores.length || (legacyClient ? 1 : 0),
            isRedisStore: isKeyvRedis || isLegacyRedis,
            details: isKeyvRedis
                ? {
                    kind: keyvStore?.constructor?.name,
                    url: keyvStore?.opts?.url,
                    keyPrefix: keyvStore?.opts?.keyPrefix,
                }
                : isLegacyRedis
                    ? {
                        kind: legacyStore?.name ?? 'legacy-redis',
                        isOpen: legacyClient?.isOpen,
                        host: legacyClient?.options?.socket?.host,
                        port: legacyClient?.options?.socket?.port,
                        db: legacyClient?.options?.database ?? 0,
                        username: legacyClient?.options?.username ?? undefined,
                        keyPrefix: legacyStore?.options?.keyPrefix ?? undefined,
                    }
                    : null,
        };
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService])
], CacheService);
//# sourceMappingURL=cache.service.js.map