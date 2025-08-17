// src/common/interceptor/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CustomHttpExceptionResponse } from './http-exception-response.interface';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';

const isProd = process.env.NODE_ENV === 'production';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ResponseInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({ status: 'success', data })),
      catchError((err) => {
        // map known 4xx
        if (
          err instanceof BadRequestException ||
          err instanceof NotFoundException ||
          err instanceof ForbiddenException
        ) {
          const errorMessage = err.getResponse();
          const statusCode =
            err instanceof BadRequestException
              ? HttpStatus.BAD_REQUEST
              : err instanceof NotFoundException
                ? HttpStatus.NOT_FOUND
                : HttpStatus.FORBIDDEN;

          const message =
            typeof errorMessage === 'string'
              ? errorMessage
              : ((errorMessage as any)?.message ?? err.message);

          // log as warn for 4xx
          this.logWithPino('warn', request, statusCode, message, err);

          return throwError(
            () =>
              new HttpException(
                this.getErrorResponse(statusCode, message),
                statusCode,
              ),
          );
        }

        // everything else -> 5xx (or provided statusCode)
        const status =
          Number((err as any)?.statusCode) || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = err?.message || 'Internal server error';

        const errorResponse = this.getErrorResponse(status, message);

        // structured log with correlation id
        this.logWithPino(
          status >= 500 ? 'error' : 'warn',
          request,
          status,
          message,
          err,
        );

        return throwError(() => new HttpException(errorResponse, status));
      }),
    );
  }

  private getErrorResponse = (
    status: HttpStatus,
    errorMessage: string,
  ): CustomHttpExceptionResponse => ({
    status: 'error',
    error: { message: errorMessage },
  });

  private logWithPino(
    level: 'error' | 'warn',
    req: Request,
    status: number,
    message: string,
    exception: unknown,
  ) {
    const payload = {
      status,
      req: {
        id: (req as any).id, // set by pinoHttp.genReqId
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers?.host,
          origin: req.headers?.origin,
        },
        remoteAddress: req.socket?.remoteAddress,
      },
      user: req.cookies?.Authentication ? 'User With Auth Token' : 'Anonymous',
      error:
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
              ...(isProd ? {} : { stack: exception.stack }),
            }
          : exception,
    };

    if (level === 'error') {
      this.logger.error(payload, 'HTTP error');
    } else {
      this.logger.warn(payload, 'HTTP client error');
    }
  }
}
