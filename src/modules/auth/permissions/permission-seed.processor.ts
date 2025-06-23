import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PermissionsService } from './permissions.service';

@Processor('permission-seed-queue')
export class PermissionSeedProcessor extends WorkerHost {
  constructor(private readonly permissionService: PermissionsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case 'seed-permissions':
          await this.retryWithLogging(
            () => this.handleSeedPermissions(job),
            job.name,
          );
          break;

        default:
          console.warn(`⚠️ Unhandled job type: ${job.name}`);
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
        console.warn(`⏱️ Attempt ${i} failed for ${jobName}:`, err);
        if (i < attempts) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          throw err;
        }
      }
    }
  }

  async handleSeedPermissions(job: Job<{ companyId: string }>) {
    const { companyId } = job.data;
    try {
      await this.permissionService.seedDefaultPermissionsForCompany(companyId);
    } catch (err) {
      console.error(
        `❌ Error while seeding permissions for ${companyId}:`,
        err,
      );
      throw err;
    }
  }
}
