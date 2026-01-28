import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { ResumeScoringService } from './resume-scoring.service';

@Processor('resumeScoringQueue')
export class ResumeScoringProcessor extends WorkerHost {
  constructor(
    private readonly resumeScoringService: ResumeScoringService,
    @InjectQueue('resumeScoringQueue') private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case 'score-resume':
          await this.retryWithLogging(
            () => this.handleResumeScoring(job.data),
            job.name,
          );
          break;

        default:
          console.warn(`⚠️ Unhandled job: ${job.name}`);
      }
    } catch (error) {
      console.error(`❌ Final error in job ${job.name}:`, error);
      throw error;
    }
  }

  private async retryWithLogging(
    task: () => Promise<void>,
    jobName: string,
    attempts = 3,
    delay = 1000,
  ) {
    for (let i = 1; i <= attempts; i++) {
      try {
        await task();
        return;
      } catch (err) {
        console.warn(
          `⏱️ Attempt ${i} failed for ${jobName}:`,
          err.message || err,
        );
        if (i < attempts) await new Promise((res) => setTimeout(res, delay));
        else throw err;
      }
    }
  }

  private async handleResumeScoring(data: any) {
    const { resumeUrl, job, applicationId } = data;
    if (!resumeUrl || !job || !applicationId) {
      throw new Error('Missing required resume scoring data');
    }

    await this.resumeScoringService.analyzeResumeFromUrl(
      resumeUrl,
      job,
      applicationId,
    );
  }
}
