"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ResponseInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const nestjs_pino_1 = require("nestjs-pino");
const isProd = process.env.NODE_ENV === 'production';
let ResponseInterceptor = ResponseInterceptor_1 = class ResponseInterceptor {
    constructor(logger) {
        this.logger = logger;
        this.getErrorResponse = (status, errorMessage) => ({
            status: 'error',
            error: { message: errorMessage },
        });
        this.logger.setContext(ResponseInterceptor_1.name);
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        return next.handle().pipe((0, operators_1.map)((data) => ({ status: 'success', data })), (0, operators_1.catchError)((err) => {
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                const errorMessage = err.getResponse();
                const statusCode = err instanceof common_1.BadRequestException
                    ? common_1.HttpStatus.BAD_REQUEST
                    : err instanceof common_1.NotFoundException
                        ? common_1.HttpStatus.NOT_FOUND
                        : common_1.HttpStatus.FORBIDDEN;
                const message = typeof errorMessage === 'string'
                    ? errorMessage
                    : (errorMessage?.message ?? err.message);
                this.logWithPino('warn', request, statusCode, message, err);
                return (0, rxjs_1.throwError)(() => new common_1.HttpException(this.getErrorResponse(statusCode, message), statusCode));
            }
            const status = Number(err?.statusCode) || common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            const message = err?.message || 'Internal server error';
            const errorResponse = this.getErrorResponse(status, message);
            this.logWithPino(status >= 500 ? 'error' : 'warn', request, status, message, err);
            return (0, rxjs_1.throwError)(() => new common_1.HttpException(errorResponse, status));
        }));
    }
    logWithPino(level, req, status, message, exception) {
        const payload = {
            status,
            req: {
                id: req.id,
                method: req.method,
                url: req.url,
                headers: {
                    host: req.headers?.host,
                    origin: req.headers?.origin,
                },
                remoteAddress: req.socket?.remoteAddress,
            },
            user: req.cookies?.Authentication ? 'User With Auth Token' : 'Anonymous',
            error: exception instanceof Error
                ? {
                    name: exception.name,
                    message: exception.message,
                    ...(isProd ? {} : { stack: exception.stack }),
                }
                : exception,
        };
        if (level === 'error') {
            this.logger.error(payload, 'HTTP error');
        }
        else {
            this.logger.warn(payload, 'HTTP client error');
        }
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = ResponseInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nestjs_pino_1.PinoLogger])
], ResponseInterceptor);
//# sourceMappingURL=error-interceptor.js.map