"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrizzleModule = exports.HOT_QUERIES = exports.PG_POOL = exports.DRIZZLE = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = require("./schema");
const hot_queries_1 = require("./hot-queries");
exports.DRIZZLE = Symbol('DRIZZLE');
exports.PG_POOL = Symbol('PG_POOL');
exports.HOT_QUERIES = Symbol('HOT_QUERIES');
function buildPoolConfig(cfg) {
    const isProd = process.env.NODE_ENV === 'production';
    const connectionString = cfg.get('DATABASE_URL');
    if (!connectionString)
        throw new Error('DATABASE_URL is not set');
    const sslDisabled = cfg.get('PGSSL_DISABLE') === '1';
    const ca = cfg.get('PG_CA_CERT');
    const ssl = sslDisabled
        ? false
        : ca
            ? { rejectUnauthorized: true, ca }
            : isProd
                ? false
                : { rejectUnauthorized: false };
    const config = {
        connectionString,
        ssl,
        max: Number(process.env.PG_POOL_MAX || (isProd ? 20 : 10)),
        idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || (isProd ? 30_000 : 10_000)),
        connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5_000),
        keepAlive: true,
        keepAliveInitialDelayMillis: 10_000,
    };
    if (!isProd) {
        config.maxUses = Number(process.env.PG_MAX_USES || 500);
    }
    return config;
}
let DrizzleModule = class DrizzleModule {
};
exports.DrizzleModule = DrizzleModule;
exports.DrizzleModule = DrizzleModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: exports.PG_POOL,
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const g = globalThis;
                    if (!g.__PG_POOL__) {
                        const pool = new pg_1.Pool(buildPoolConfig(config));
                        pool.on('error', (err) => {
                            console.warn('[pg pool] idle client error:', err?.code || err?.message || err);
                        });
                        g.__PG_POOL__ = pool;
                    }
                    return g.__PG_POOL__;
                },
            },
            {
                provide: exports.DRIZZLE,
                inject: [exports.PG_POOL],
                useFactory: (pool) => (0, node_postgres_1.drizzle)(pool, { schema }),
            },
            {
                provide: exports.HOT_QUERIES,
                inject: [exports.PG_POOL],
                useFactory: (pool) => new hot_queries_1.HotQueries(pool),
            },
            {
                provide: 'DB_SHUTDOWN_HOOK',
                inject: [exports.PG_POOL],
                useFactory: (pool) => ({
                    async onApplicationShutdown() {
                        if (process.env.NODE_ENV === 'production') {
                            try {
                                await pool.end();
                            }
                            catch {
                            }
                        }
                    },
                }),
            },
        ],
        exports: [exports.DRIZZLE, exports.PG_POOL, exports.HOT_QUERIES],
    })
], DrizzleModule);
//# sourceMappingURL=drizzle.module.js.map