import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { ResumeScoringService } from './resume-scoring.service';
export declare class ResumeScoringProcessor extends WorkerHost {
    private readonly resumeScoringService;
    private readonly queue;
    constructor(resumeScoringService: ResumeScoringService, queue: Queue);
    process(job: Job): Promise<void>;
    private retryWithLogging;
    private handleResumeScoring;
}
