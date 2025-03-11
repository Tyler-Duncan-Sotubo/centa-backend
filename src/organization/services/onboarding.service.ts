import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { onboardingProgress } from 'src/drizzle/schema/onboarding_progress.schema';

@Injectable()
export class OnboardingService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  defaultTasks = [
    {
      taskKey: 'completeYourCompanyProfile',
      url: '/dashboard/settings/organization',
    },
    { taskKey: 'taxNumbersAdded', url: '/dashboard/settings/taxes' },
    {
      taskKey: 'payrollSettingsUpdated',
      url: '/dashboard/settings/payroll-settings',
    },
    {
      taskKey: 'payrollScheduleUpdated',
      url: '/dashboard/settings/pay-frequency',
    },
    { taskKey: 'addEmployees', url: '/dashboard/employees' },
  ];

  async createOnboardingTasks(companyId: string) {
    const tasks = this.defaultTasks.map((task) => ({
      companyId,
      taskKey: task.taskKey,
      url: task.url, // Storing the URL
    }));

    await this.db.insert(onboardingProgress).values(tasks).execute();
  }

  async completeTask(companyId: string, taskKey: string) {
    await this.db
      .update(onboardingProgress)
      .set({ completed: true })
      .where(
        and(
          eq(onboardingProgress.companyId, companyId),
          eq(onboardingProgress.taskKey, taskKey),
        ),
      )
      .execute();
  }

  async getOnboardingTasks(companyId: string) {
    return this.db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.companyId, companyId))
      .orderBy(onboardingProgress.taskKey)
      .execute();
  }
}
