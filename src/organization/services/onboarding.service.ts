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
      taskKey: 'setupCompanyProfile',
      url: '/dashboard/settings/organization',
    },
    {
      taskKey: 'addTaxInformation',
      url: '/dashboard/settings/taxes',
    },
    {
      taskKey: 'configurePayrollSchedule',
      url: '/dashboard/settings/pay-frequency',
    },
    {
      taskKey: 'setupPayGroups',
      url: '/dashboard/groups',
    },
    {
      taskKey: 'addTeamMembers',
      url: '/dashboard/employees',
    },
    {
      taskKey: 'updatePayrollSettings',
      url: '/dashboard/settings/payroll-settings',
    },
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
    const tasks = await this.db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.companyId, companyId))
      .execute(); // Removed orderBy since we will sort manually

    // Create a map for the default task order
    const taskOrderMap = new Map(
      this.defaultTasks.map((task, index) => [task.taskKey, index]),
    );

    // Sort tasks based on predefined order
    return tasks.sort(
      (a, b) =>
        (taskOrderMap.get(a.taskKey) ?? Number.MAX_VALUE) -
        (taskOrderMap.get(b.taskKey) ?? Number.MAX_VALUE),
    );
  }
}
