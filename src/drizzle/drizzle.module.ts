// src/drizzle/drizzle.module.ts
import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { db } from './types/drizzle';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  imports: [ConfigModule], // ensures ConfigService is available even if not global
  providers: [
    // Shared pg.Pool (HMR-safe)
    {
      provide: 'PG_POOL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseURL = config.get<string>('DATABASE_URL');
        if (!databaseURL) throw new Error('DATABASE_URL is not set');

        // Reuse the pool across dev hot-reloads
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
            statement_timeout: Number(process.env.PG_STMT_TIMEOUT_MS || 30_000),
            application_name: process.env.PG_APP_NAME || 'nest-drizzle',
            keepAlive: true,
            // optional: recycle after N uses to avoid long-lived session bloat
            maxUses: Number(process.env.PG_MAX_USES || 7_500),
          });

          // Small debug to verify connections aren’t exploding
          g.__PG_POOL__.on('connect', () =>
            console.log('[PG] new connection established'),
          );
        }

        return g.__PG_POOL__ as Pool;
      },
    },

    // Drizzle instance built with schema (no runtime introspection)
    {
      provide: DRIZZLE,
      inject: ['PG_POOL'],
      useFactory: (pool: Pool) => {
        const db = drizzle(pool, { schema });
        return db as db;
      },
    },

    // Graceful shutdown
    {
      provide: 'DB_SHUTDOWN_HOOK',
      inject: ['PG_POOL'],
      useFactory: (pool: Pool): OnApplicationShutdown => ({
        async onApplicationShutdown() {
          // Don’t close in dev HMR; Guard with env if you prefer
          if (process.env.NODE_ENV === 'production') {
            await pool.end();
            console.log('[PG] pool closed');
          }
        },
      }),
    },
  ],
  exports: [DRIZZLE /*, 'PG_POOL'*/],
})
export class DrizzleModule {}
