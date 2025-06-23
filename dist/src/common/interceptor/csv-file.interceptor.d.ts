import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class ResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private getErrorResponse;
    private extractErrorMessage;
    private getErrorCode;
    private logError;
    private writeErrorLogToFile;
}
