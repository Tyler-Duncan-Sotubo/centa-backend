import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomHttpExceptionResponse } from 'src/common/interceptor/http-exception-response.interface';
import { PrimaryGuard } from './primary.guard';
import { AuthenticatedRequest } from '../types/custom-request.interface'; // Import the custom type
import * as fs from 'fs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtGuard: PrimaryGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedRequest = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    try {
      const isAuthenticated = await this.jwtGuard.canActivate(context);
      if (!isAuthenticated) return false;
    } catch (error) {
      this.logger.error(error.message);
      this.handleUnauthorized(request, error.message);
    }

    const user = request.user;
    if (!user) {
      this.handleUnauthorized(request, 'User does not exist');
    }

    // Check permissions from metadata
    const requiredPermissions =
      this.reflector.get<string[]>('permissions', context.getHandler()) || [];

    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every((perm) =>
        user?.permissions.includes(perm),
      );

      if (!hasPermission) {
        this.handleUnauthorized(
          request,
          `You don't have permission to perform this action.`,
        );
      }
    }

    return true;
  }

  private handleUnauthorized(request: AuthenticatedRequest, error: any): void {
    const errorResponse: CustomHttpExceptionResponse = {
      status: 'error',
      error: { message: error },
    };

    const errorLog = this.logError(errorResponse, request);
    this.writeErrorLogToFile(errorLog);
    throw new HttpException(errorResponse, 401);
  }

  private logError(
    errorResponse: CustomHttpExceptionResponse,
    request: AuthenticatedRequest,
  ): string {
    return `URL: '${request.url}'\nMethod: ${request.method}\nTimestamp: '${new Date().toISOString()}'\nError Message: ${errorResponse.error.message}\n\n`;
  }

  private writeErrorLogToFile(errorLog: string): void {
    fs.appendFile('error.log', errorLog, (err) => {
      if (err) console.error('Failed to write error log:', err);
    });
  }
}
