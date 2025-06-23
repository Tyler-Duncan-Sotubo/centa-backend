import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PermissionsService } from './permissions.service';
export declare class PermissionSeedProcessor extends WorkerHost {
    private readonly permissionService;
    constructor(permissionService: PermissionsService);
    process(job: Job): Promise<void>;
    private retryWithLogging;
    handleSeedPermissions(job: Job<{
        companyId: string;
    }>): Promise<void>;
}
