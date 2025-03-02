import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../config/interceptor/error-interceptor';

@UseInterceptors(ResponseInterceptor)
export abstract class BaseController {}
