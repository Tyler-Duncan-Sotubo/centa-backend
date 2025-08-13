import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../interceptor/error-interceptor';

@UseInterceptors(ResponseInterceptor)
export abstract class BaseController {}
