import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
export declare class ResponseInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: PinoLogger);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private getErrorResponse;
    private logWithPino;
}
