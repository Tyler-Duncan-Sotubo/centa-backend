import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { termination_types } from './schema/termination-types.schema';
import { termination_reasons } from './schema/termination-reasons.schema';
import { termination_checklist_items } from './schema/termination-checklist-items.schema';

@Injectable()
export class OffboardingSeederService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async seedGlobalOffboardingData() {
    await Promise.all([
      this.seedTypes(),
      this.seedReasons(),
      this.seedChecklistItems(),
    ]);
  }

  private async seedTypes() {
    const types = [
      {
        name: 'Fired',
        description: 'Employee terminated due to misconduct or violations',
      },
      {
        name: 'Laid Off',
        description: 'Termination due to downsizing or redundancy',
      },
      {
        name: 'Resigned',
        description: 'Voluntary resignation by the employee',
      },
      {
        name: 'Mutual Agreement',
        description: 'Separation agreed upon by both parties',
      },
    ];

    for (const type of types) {
      const exists = await this.db.query.termination_types.findFirst({
        where: (t, { eq }) => eq(t.name, type.name),
      });

      if (!exists) {
        await this.db.insert(termination_types).values({
          name: type.name,
          description: type.description,
          isGlobal: true,
          companyId: null,
        });
      }
    }
  }

  private async seedReasons() {
    const reasons = [
      {
        name: 'Attendance issues',
        description: 'Chronic lateness or absenteeism',
      },
      {
        name: 'Misconduct',
        description: 'Violation of company policies or ethics',
      },
      {
        name: 'Rudeness to coworker',
        description: 'Inappropriate behavior towards peers',
      },
      {
        name: 'Insubordination',
        description: 'Refusal to follow directions or disrespect to authority',
      },
      {
        name: 'Performance',
        description: 'Failure to meet job expectations or goals',
      },
    ];

    for (const reason of reasons) {
      const exists = await this.db.query.termination_reasons.findFirst({
        where: (r, { eq }) => eq(r.name, reason.name),
      });

      if (!exists) {
        await this.db.insert(termination_reasons).values({
          name: reason.name,
          description: reason.description,
          isGlobal: true,
          companyId: null,
        });
      }
    }
  }

  private async seedChecklistItems() {
    const checklist = [
      {
        name: 'Remove employee from Payroll',
        description: 'Fax termination letter to payroll provider',
        isAssetReturnStep: false,
      },
      {
        name: 'Remove employee from benefits plan',
        description: 'Remove employee from benefit company',
        isAssetReturnStep: false,
      },
      {
        name: 'Calculate vacation payout',
        description: 'Calculate remaining vacation days to payout',
        isAssetReturnStep: false,
      },
      {
        name: 'Disable email address',
        description: 'Make sure IT revoked access to emails',
        isAssetReturnStep: false,
      },
      {
        name: 'Return all company assets',
        description: 'Collect laptop, ID badge, etc.',
        isAssetReturnStep: true,
      },
    ];

    for (const [index, item] of checklist.entries()) {
      const exists = await this.db.query.termination_checklist_items.findFirst({
        where: (i, { eq }) => eq(i.name, item.name),
      });

      if (!exists) {
        await this.db.insert(termination_checklist_items).values({
          name: item.name,
          description: item.description,
          isAssetReturnStep: item.isAssetReturnStep,
          isGlobal: true,
          companyId: null,
          order: index + 1,
          createdAt: new Date(),
        });
      }
    }
  }
}
