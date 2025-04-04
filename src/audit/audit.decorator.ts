import { SetMetadata } from '@nestjs/common';

export const Audit = (meta: { action: string; entity: string }) =>
  SetMetadata('audit', meta);
