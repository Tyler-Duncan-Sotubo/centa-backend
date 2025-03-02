import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  HttpException,
  BadRequestException,
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
        // Constructing success response
        return {
          status: 'success',
          data, // This is where your response data will go
        };
      }),
      catchError((err) => {
        if (err instanceof BadRequestException) {
          // Handling bad request exception
          const errorMessage = err.getResponse();
          throw new HttpException(
            this.getErrorResponse(
              HttpStatus.BAD_REQUEST,
              typeof errorMessage === 'string'
                ? errorMessage
                : (errorMessage as any).message,
            ),
            HttpStatus.BAD_REQUEST,
          );
        }
        // Constructing error response
        const errorResponse = this.getErrorResponse(
          err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          err.message,
        );

        // Log the error and write it to the file
        const errorLog = this.logError(errorResponse, request);
        this.writeErrorLogToFile(errorLog);

        // Throwing an HTTP exception with the error response
        throw new HttpException(errorResponse, err.statusCode);
      }),
    );
  }

  private getErrorResponse = (
    status: HttpStatus,
    errorMessage: string,
  ): CustomHttpExceptionResponse => ({
    status: 'error', // Indicating that an error occurred
    error: {
      message: errorMessage,
    },
  });

  private getErrorCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_SERVER_ERROR';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      // Add more mappings as necessary
      default:
        return 'UNKNOWN_ERROR'; // Fallback for unhandled status codes
    }
  }

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
      if (err) throw err; // You may want to handle this more gracefully in production
    });
  };
}
