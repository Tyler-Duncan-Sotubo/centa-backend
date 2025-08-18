"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const crypto_1 = require("crypto");
const pino_1 = require("pino");
const isProd = process.env.NODE_ENV === 'production';
const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
const ingest = process.env.LOGTAIL_INGEST_HOST;
let LoggerModule = class LoggerModule {
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
                    timestamp: pino_1.default.stdTimeFunctions.isoTime,
                    messageKey: 'message',
                    customAttributeKeys: {
                        req: 'httpRequest',
                        res: 'httpResponse',
                        err: 'error',
                        responseTime: 'latency_ms',
                    },
                    customProps: (req, res) => ({
                        service: process.env.APP_NAME || 'app',
                        version: process.env.APP_VERSION || '0.0.0',
                        env: process.env.NODE_ENV || 'development',
                        requestId: req.id,
                        route: req.route?.path,
                        status: res?.statusCode,
                    }),
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
                    genReqId: (req) => req.headers['x-request-id'] || crypto_1.default.randomUUID(),
                    autoLogging: {
                        ignore: (req) => ['/health', '/metrics'].includes(req.url ?? ''),
                    },
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
                                    },
                                ]
                                : []),
                            ...(logtailToken && ingest
                                ? [
                                    {
                                        target: '@logtail/pino',
                                        level: process.env.LOGTAIL_LEVEL || 'warn',
                                        options: {
                                            sourceToken: logtailToken,
                                            options: { endpoint: `https://${ingest}` },
                                        },
                                    },
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
        exports: [nestjs_pino_1.LoggerModule],
    })
], LoggerModule);
//# sourceMappingURL=logger.module.js.map