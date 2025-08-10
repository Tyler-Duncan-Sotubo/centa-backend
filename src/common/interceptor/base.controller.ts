import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from './error-interceptor';

@UseInterceptors(ResponseInterceptor)
export abstract class BaseController {}
