import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
export declare class PayrollProcessor extends WorkerHost {
    constructor();
    process(job: Job): Promise<void>;
}
