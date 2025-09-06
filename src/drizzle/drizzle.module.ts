// src/drizzle/drizzle.module.ts
import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { db } from './types/drizzle';
import * as schema from './schema';
import { HotQueries } from './hot-queries';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');
export const HOT_QUERIES = Symbol('HOT_QUERIES');

function buildPoolConfig(cfg: ConfigService): PoolConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const connectionString = cfg.get<string>('DATABASE_URL');
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  // SSL policy:
  // - Prod: typically internal, so disable unless PGSSL_DISABLE=0 and you provide PG_CA_CERT.
  // - Dev: allow self-signed unless you provide a CA.
  const sslDisabled = cfg.get<string>('PGSSL_DISABLE') === '1';
  const ca = cfg.get<string>('PG_CA_CERT'); // PEM chain (optional)

  const ssl: PoolConfig['ssl'] = sslDisabled
    ? false
    : ca
      ? { rejectUnauthorized: true, ca }
      : isProd
        ? false
        : { rejectUnauthorized: false }; // dev fallback for self-signed

  const config: PoolConfig = {
    connectionString,
    ssl,
    max: Number(process.env.PG_POOL_MAX || (isProd ? 20 : 10)),
    idleTimeoutMillis: Number(
      process.env.PG_IDLE_TIMEOUT_MS || (isProd ? 30_000 : 10_000),
    ),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5_000),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };

  // Optional: recycle clients in dev to reduce long-lived socket flakes (pg >= 8.11)
  if (!isProd) {
    (config as any).maxUses = Number(process.env.PG_MAX_USES || 500);
  }

  return config;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Shared pg.Pool (singleton, with error handler)
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const g = globalThis as any;
        if (!g.__PG_POOL__) {
          const pool = new Pool(buildPoolConfig(config));

          // Prevent process crash when an idle client dies (dev proxies, hot reload, etc.)
          pool.on('error', (err) => {
            // eslint-disable-next-line no-console
            console.warn(
              '[pg pool] idle client error:',
              err?.code || err?.message || err,
            );
          });

          g.__PG_POOL__ = pool;
        }
        return g.__PG_POOL__ as Pool;
      },
    },

    // Drizzle instance
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }) as db,
    },

    // HotQueries wrapper (prepared statements)
    {
      provide: HOT_QUERIES,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => new HotQueries(pool),
    },

    // Graceful shutdown (only close in prod)
    {
      provide: 'DB_SHUTDOWN_HOOK',
      inject: [PG_POOL],
      useFactory: (pool: Pool): OnApplicationShutdown => ({
        async onApplicationShutdown() {
          if (process.env.NODE_ENV === 'production') {
            try {
              await pool.end();
              // eslint-disable-next-line no-console
              console.log('[PG] pool closed');
            } catch {
              /* ignore */
            }
          }
        },
      }),
    },
  ],
  exports: [DRIZZLE, PG_POOL, HOT_QUERIES],
})
export class DrizzleModule {}
