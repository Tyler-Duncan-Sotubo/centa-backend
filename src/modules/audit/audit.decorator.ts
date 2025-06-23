import { SetMetadata } from '@nestjs/common';
import { AuditMeta } from './audit.interceptor';
import { AUDIT_META_KEY } from './constant/audit.constant';

export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_META_KEY, meta);
