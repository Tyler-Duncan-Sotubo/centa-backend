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
    buildVersionedKey(companyId, ver, ...parts) {
        return ['company', companyId, `v${ver}`, ...parts].join(':');
    }
    getRedisClient() {
        const anyCache = this.cacheManager;
        const stores = anyCache?.stores ?? (anyCache?.store ? [anyCache.store] : []);
        const first = stores[0] ?? anyCache?.store;
        const client = first?.store?.redis || first?.store?.client || first?.client || null;
        return client ?? null;
    }
    async safeRedisCall(fn, fallback) {
        const client = this.getRedisClient();
        if (!client) {
            if (fallback)
                return fallback();
            return undefined;
        }
        try {
            return await fn(client);
        }
        catch (err) {
            this.logger.warn(`Redis operation failed: ${err.message}`);
            if (fallback)
                return fallback();
            return undefined;
        }
    }
    async getCompanyVersion(companyId) {
        const versionKey = `company:${companyId}:ver`;
        return (await this.safeRedisCall(async (client) => {
            const raw = await client.get(versionKey);
            if (raw)
                return Number(raw);
            if (client.set)
                await client.set(versionKey, '1');
            return 1;
        }, async () => {
            const raw = await this.cacheManager.get(versionKey);
            if (raw)
                return Number(raw);
            await this.cacheManager.set(versionKey, '1');
            return 1;
        }));
    }
    async bumpCompanyVersion(companyId) {
        const versionKey = `company:${companyId}:ver`;
        return (await this.safeRedisCall(async (client) => {
            if (!client.incr)
                throw new Error('INCR not available');
            const v = await client.incr(versionKey);
            return Number(v);
        }, async () => {
            this.logger.warn(`bumpCompanyVersion: falling back to non-atomic increment for company=${companyId}`);
            const current = await this.getCompanyVersion(companyId);
            const next = current + 1;
            await this.cacheManager.set(versionKey, String(next));
            return next;
        }));
    }
    async getOrSetVersioned(companyId, keyParts, compute, opts) {
        const ver = await this.getCompanyVersion(companyId);
        const key = this.buildVersionedKey(companyId, ver, ...keyParts);
        const hit = await this.cacheManager.get(key);
        if (hit !== undefined && hit !== null)
            return hit;
        const val = await compute();
        const ttl = opts?.ttlSeconds ? opts.ttlSeconds * 1000 : this.ttlMs;
        await this.cacheManager.set(key, val, ttl);
        if (opts?.tags?.length) {
            await this.attachTags(key, opts.tags);
        }
        return val;
    }
    async resetCompanyVersion(companyId) {
        const versionKey = `company:${companyId}:ver`;
        return (await this.safeRedisCall(async (client) => {
            await client.set(versionKey, '1');
            return 1;
        }, async () => {
            await this.cacheManager.set(versionKey, '1');
            return 1;
        }));
    }
    async attachTags(cacheKey, tags) {
        await this.safeRedisCall(async (client) => {
            if (!client.sadd)
                return;
            const pipe = client.multi?.() ?? client.pipeline?.();
            for (const tag of tags) {
                pipe.sadd(`tag:${tag}`, cacheKey);
            }
            await pipe.exec();
        }, async () => {
            this.logger.debug(`attachTags: Redis not available; skipping tags for ${cacheKey}`);
        });
    }
    async invalidateTags(tags) {
        await this.safeRedisCall(async (client) => {
            if (!client.smembers)
                return;
            const keysToDelete = [];
            for (const tag of tags) {
                const members = await client.smembers(`tag:${tag}`);
                if (members?.length)
                    keysToDelete.push(...members);
            }
            if (keysToDelete.length)
                await client.del(...keysToDelete);
            const delPipe = client.multi?.() ?? client.pipeline?.();
            for (const tag of tags)
                delPipe.del(`tag:${tag}`);
            await delPipe.exec();
        }, async () => {
            this.logger.debug(`invalidateTags: Redis not available; skipping tag invalidation`);
        });
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService])
], CacheService);
//# sourceMappingURL=cache.service.js.map