// src/drizzle/drizzle.module.ts
import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { db } from './types/drizzle';
import * as schema from './schema';
import { HotQueries } from './hot-queries';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');
export const HOT_QUERIES = Symbol('HOT_QUERIES');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Shared pg.Pool
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseURL = config.get<string>('DATABASE_URL');
        if (!databaseURL) throw new Error('DATABASE_URL is not set');

        const g = globalThis as any;
        if (!g.__PG_POOL__) {
          g.__PG_POOL__ = new Pool({
            connectionString: databaseURL,
            ssl:
              process.env.NODE_ENV === 'production'
                ? false
                : { rejectUnauthorized: false },
            max: Number(process.env.PG_POOL_MAX || 10),
            idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
            connectionTimeoutMillis: Number(
              process.env.PG_CONN_TIMEOUT_MS || 5_000,
            ),
            keepAlive: true,
          });
        }
        return g.__PG_POOL__ as Pool;
      },
    },

    // Drizzle instance
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => {
        const db = drizzle(pool, { schema });
        return db as db;
      },
    },

    // HotQueries wrapper (prepared statements)
    {
      provide: HOT_QUERIES,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => new HotQueries(pool),
    },

    // Graceful shutdown
    {
      provide: 'DB_SHUTDOWN_HOOK',
      inject: [PG_POOL],
      useFactory: (pool: Pool): OnApplicationShutdown => ({
        async onApplicationShutdown() {
          if (process.env.NODE_ENV === 'production') {
            await pool.end();
            console.log('[PG] pool closed');
          }
        },
      }),
    },
  ],
  exports: [DRIZZLE, PG_POOL, HOT_QUERIES],
})
export class DrizzleModule {}
