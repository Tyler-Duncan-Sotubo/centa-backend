import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
        // redact sensitive stuff if it ever shows up
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
        // add request id so you can trace a whole request
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) || crypto.randomUUID(),
        // pretty in dev; newline-delimited JSON in prod (ship to ELK/Loki/CloudWatch)
        transport: isProd
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'SYS:standard',
              },
            },
        // slimmer logs (optional)
        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              headers: {
                host: req.headers?.host,
                origin: req.headers?.origin,
              },
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
})
export class LoggerModule {}
