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
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CustomHttpExceptionResponse } from './http-exception-response.interface';
import { Request } from 'express';
import * as fs from 'fs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        return {
          status: 'success',
          data,
        };
      }),
      catchError((err) => {
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

          throw new HttpException(
            this.getErrorResponse(
              statusCode,
              typeof errorMessage === 'string'
                ? errorMessage
                : (errorMessage as any).message,
            ),
            statusCode,
          );
        }

        const errorResponse = this.getErrorResponse(
          err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          err.message,
        );

        const errorLog = this.logError(errorResponse, request);
        this.writeErrorLogToFile(errorLog);

        throw new HttpException(errorResponse, err.statusCode);
      }),
    );
  }

  private getErrorResponse = (
    status: HttpStatus,
    errorMessage: string,
  ): CustomHttpExceptionResponse => ({
    status: 'error',
    error: {
      message: errorMessage,
    },
  });

  private logError = (
    errorResponse: CustomHttpExceptionResponse,
    request: Request,
  ): string => {
    const { error } = errorResponse;
    const { method, url, cookies } = request;
    const errorLog =
      `URL: '${url}'\n` +
      `Method: ${method}\n` +
      `Timestamp: '${new Date().toISOString()}'\n` +
      `User Info: '${cookies.Authentication ? 'User With Auth Token' : 'No user info from cookie'}'\n` +
      `Error Message: ${error.message}\n\n`;
    return errorLog;
  };

  private writeErrorLogToFile = (errorLog: string): void => {
    fs.appendFile('error.log', errorLog, (err) => {
      if (err) throw err;
    });
  };
}
