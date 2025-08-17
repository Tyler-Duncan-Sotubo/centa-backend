import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isProd = process.env.NODE_ENV === 'production';
const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
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
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) || crypto.randomUUID(),

        // 👇 pretty console in dev + Better Stack remote
        transport: {
          targets: [
            ...(!isProd
              ? [
                  {
                    target: 'pino-pretty',
                    level: 'debug',
                    options: {
                      singleLine: true,
                      colorize: true,
                      translateTime: 'SYS:standard',
                    },
                  } as const,
                ]
              : []),
            ...(logtailToken
              ? [
                  {
                    target: '@logtail/pino',
                    level: process.env.LOGTAIL_LEVEL || 'warn',
                    options: { sourceToken: logtailToken },
                  } as const,
                ]
              : []),
          ],
        },

        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              headers: { host: req.headers?.host, origin: req.headers?.origin },
              remoteAddress: req.remoteAddress,
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
