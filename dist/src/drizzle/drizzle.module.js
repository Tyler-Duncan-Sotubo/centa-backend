"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrizzleModule = exports.DRIZZLE = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = require("./schema");
exports.DRIZZLE = Symbol('DRIZZLE');
let DrizzleModule = class DrizzleModule {
};
exports.DrizzleModule = DrizzleModule;
exports.DrizzleModule = DrizzleModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: 'PG_POOL',
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const databaseURL = config.get('DATABASE_URL');
                    if (!databaseURL)
                        throw new Error('DATABASE_URL is not set');
                    const g = globalThis;
                    if (!g.__PG_POOL__) {
                        g.__PG_POOL__ = new pg_1.Pool({
                            connectionString: databaseURL,
                            ssl: process.env.NODE_ENV === 'production'
                                ? false
                                : { rejectUnauthorized: false },
                            max: Number(process.env.PG_POOL_MAX || 10),
                            idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
                            connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5_000),
                            statement_timeout: Number(process.env.PG_STMT_TIMEOUT_MS || 30_000),
                            application_name: process.env.PG_APP_NAME || 'nest-drizzle',
                            keepAlive: true,
                            maxUses: Number(process.env.PG_MAX_USES || 7_500),
                        });
                    }
                    return g.__PG_POOL__;
                },
            },
            {
                provide: exports.DRIZZLE,
                inject: ['PG_POOL'],
                useFactory: (pool) => {
                    const db = (0, node_postgres_1.drizzle)(pool, { schema });
                    return db;
                },
            },
            {
                provide: 'DB_SHUTDOWN_HOOK',
                inject: ['PG_POOL'],
                useFactory: (pool) => ({
                    async onApplicationShutdown() {
                        if (process.env.NODE_ENV === 'production') {
                            await pool.end();
                            console.log('[PG] pool closed');
                        }
                    },
                }),
            },
        ],
        exports: [exports.DRIZZLE],
    })
], DrizzleModule);
//# sourceMappingURL=drizzle.module.js.map