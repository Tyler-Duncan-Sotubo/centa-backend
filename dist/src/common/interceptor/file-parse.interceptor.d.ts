import { NestInterceptor, Type } from '@nestjs/common';
export interface FileParseOptions {
    field?: string;
    maxRows?: number;
    tempDir?: string;
    allowedExts?: string[];
}
export declare function FileParseInterceptor(opts: FileParseOptions): Type<NestInterceptor>;
