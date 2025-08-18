import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import crypto from 'crypto';
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
const ingest = process.env.LOGTAIL_INGEST_HOST; // e.g. s123.eu-nbg-2.betterstackdata.com

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),

        // human-friendly iso timestamp in JSON
        timestamp: pino.stdTimeFunctions.isoTime,

        // rename/shape core keys so they’re nicer to query in Better Stack
        messageKey: 'message', // rename "msg" -> "message"
        customAttributeKeys: {
          req: 'httpRequest',
          res: 'httpResponse',
          err: 'error',
          responseTime: 'latency_ms',
        },

        // add global props to every line
        customProps: (req, res) => ({
          service: process.env.APP_NAME || 'app',
          version: process.env.APP_VERSION || '0.0.0',
          env: process.env.NODE_ENV || 'development',
          requestId: (req as any).id, // mirrors req.id for easy filtering
          route: (req as any).route?.path,
          status: res?.statusCode,
        }),

        // keep secrets out
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'req.body.password',
            'req.body.token',
          ],
          remove: true,
        },

        // request id for correlation
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) || crypto.randomUUID(),

        // reduce noise
        autoLogging: {
          ignore: (req) => ['/health', '/metrics'].includes(req.url ?? ''),
        },

        // multi-target transports: pretty console (dev) + Better Stack
        transport: {
          targets: [
            ...(!isProd
              ? [
                  {
                    target: 'pino-pretty',
                    level: process.env.LOG_LEVEL || 'debug',
                    options: {
                      singleLine: true,
                      colorize: true,
                      translateTime: 'SYS:standard',
                    },
                  } as const,
                ]
              : []),
            ...(logtailToken && ingest
              ? [
                  {
                    target: '@logtail/pino',
                    level: process.env.LOGTAIL_LEVEL || 'warn',
                    options: {
                      sourceToken: logtailToken,
                      // Better Stack doc requires full https URL to your ingest host
                      options: { endpoint: `https://${ingest}` },
                    },
                  } as const,
                ]
              : []),
          ],
        },

        // slimmer req/res payloads
        serializers: {
          req(req) {
            return {
              id: (req as any).id,
              method: req.method,
              url: req.url,
              headers: { host: req.headers?.host, origin: req.headers?.origin },
              remoteAddress: req.socket?.remoteAddress,
              userAgent: req.headers?.['user-agent'],
            };
          },
          res(res) {
            return { statusCode: res.statusCode };
          },
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
