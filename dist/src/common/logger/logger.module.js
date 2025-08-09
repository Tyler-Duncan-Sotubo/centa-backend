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
const isProd = process.env.NODE_ENV === 'production';
let LoggerModule = class LoggerModule {
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
                    redact: {
                        paths: [
                            'req.headers.authorization',
                            'req.headers.cookie',
                            'res.headers["set-cookie"]',
                        ],
                        remove: true,
                    },
                    genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
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
], LoggerModule);
//# sourceMappingURL=logger.module.js.map