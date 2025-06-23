"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const fs = require("fs");
let ResponseInterceptor = class ResponseInterceptor {
    constructor() {
        this.getErrorResponse = (status, errorMessage) => ({
            status: 'error',
            error: {
                message: errorMessage,
            },
        });
        this.logError = (errorResponse, request) => {
            const { error } = errorResponse;
            const { method, url, cookies } = request;
            const errorLog = `URL: '${url}'\n` +
                `Method: ${method}\n` +
                `Timestamp: '${new Date().toISOString()}'\n` +
                `User Info: '${cookies.Authentication ? 'User With Auth Token' : 'No user info from cookie'}'\n` +
                `Error Message: ${error.message}\n\n`;
            return errorLog;
        };
        this.writeErrorLogToFile = (errorLog) => {
            fs.appendFile('error.log', errorLog, (err) => {
                if (err)
                    throw err;
            });
        };
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        return next.handle().pipe((0, operators_1.map)((data) => {
            return {
                status: 'success',
                data,
            };
        }), (0, operators_1.catchError)((err) => {
            let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            let errorMessage = 'Internal server error';
            if (err instanceof common_1.BadRequestException) {
                status = common_1.HttpStatus.BAD_REQUEST;
                errorMessage = this.extractErrorMessage(err);
            }
            else if (err instanceof common_1.NotFoundException) {
                status = common_1.HttpStatus.NOT_FOUND;
                errorMessage = this.extractErrorMessage(err);
            }
            else if (err instanceof common_1.ForbiddenException) {
                status = common_1.HttpStatus.FORBIDDEN;
                errorMessage = this.extractErrorMessage(err);
            }
            else if (err instanceof common_1.HttpException) {
                status = err.getStatus();
                errorMessage = this.extractErrorMessage(err);
            }
            const errorResponse = this.getErrorResponse(status, errorMessage);
            const errorLog = this.logError(errorResponse, request);
            this.writeErrorLogToFile(errorLog);
            throw new common_1.HttpException(errorResponse, status);
        }));
    }
    extractErrorMessage(err) {
        const response = err.getResponse();
        if (typeof response === 'string')
            return response;
        if (typeof response === 'object' && response.message) {
            return response.message;
        }
        return err.message;
    }
    getErrorCode(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case common_1.HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.CONFLICT:
                return 'CONFLICT';
            case common_1.HttpStatus.INTERNAL_SERVER_ERROR:
                return 'INTERNAL_SERVER_ERROR';
            case common_1.HttpStatus.SERVICE_UNAVAILABLE:
                return 'SERVICE_UNAVAILABLE';
            default:
                return 'UNKNOWN_ERROR';
        }
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseInterceptor);
//# sourceMappingURL=csv-file.interceptor.js.map