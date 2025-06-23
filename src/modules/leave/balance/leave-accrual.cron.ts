import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeavePolicyService } from '../policy/leave-policy.service';
import { LeaveBalanceService } from './leave-balance.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { users } from '../../auth/schema';
import { eq } from 'drizzle-orm';
import { CompanyService } from 'src/modules/core/company/company.service';

@Injectable()
export class LeaveAccrualCronService {
  constructor(
    private readonly leavePolicyService: LeavePolicyService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly auditService: AuditService,
    private readonly companyService: CompanyService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyLeaveAccruals() {
    const currentYear = new Date().getFullYear();
    const policies = await this.leavePolicyService.findAllAccrualPolicies();

    for (const policy of policies) {
      if (policy.accrualFrequency !== 'monthly') continue;

      const employees = await this.companyService.findAllEmployeesInCompany(
        policy.companyId,
      );

      if (!employees || employees.length === 0) {
        continue;
      }

      const superAdmin = await this.db
        .select()
        .from(users)
        .where(eq(users.companyId, policy.companyId))
        .limit(1)
        .execute();

      if (!superAdmin || superAdmin.length === 0) {
        continue;
      }

      const auditLogs: {
        action: string;
        entity: string;
        entityId: string;
        userId: string;
        changes: {
          entitlement: { oldValue: string; newValue: number };
          balance: { oldValue: string; newValue: number };
        };
      }[] = [];

      for (const employee of employees) {
        if (policy.onlyConfirmedEmployees && !employee.confirmed) continue;
        const existingBalance =
          await this.leaveBalanceService.findBalanceByLeaveType(
            policy.companyId,
            employee.id,
            policy.leaveTypeId,
            currentYear,
          );

        if (existingBalance) {
          // Update existing balance
          const entitlement = Number(existingBalance.entitlement); // Convert "1.67" → 1.67 (Number)
          const accrual = Number(policy.accrualAmount);
          const newEntitlement = entitlement + accrual;
          const newBalance = newEntitlement - Number(existingBalance.used);

          await this.leaveBalanceService.update(existingBalance.id, {
            entitlement: newEntitlement.toFixed(2),
            balance: newBalance.toFixed(2),
          });

          auditLogs.push({
            action: 'system accrual update',
            entity: 'leave_balance',
            entityId: existingBalance.id,
            userId: superAdmin[0].id,
            changes: {
              entitlement: {
                oldValue: existingBalance.entitlement,
                newValue: newEntitlement,
              },
              balance: {
                oldValue: existingBalance.balance,
                newValue: newBalance,
              },
            },
          });
        } else {
          // No existing balance → Create a new one
          const initialEntitlement = Number(policy.accrualAmount);

          const [newBalance] = await this.leaveBalanceService.create(
            policy.leaveTypeId,
            policy.companyId,
            employee.id,
            currentYear,
            initialEntitlement.toFixed(2),
            '0.00',
            initialEntitlement.toFixed(2),
          );

          auditLogs.push({
            action: 'system accrual create',
            entity: 'leave_balance',
            entityId: newBalance.id,
            userId: superAdmin[0].id,
            changes: {
              entitlement: {
                oldValue: '0',
                newValue: initialEntitlement,
              },
              balance: {
                oldValue: '0',
                newValue: initialEntitlement,
              },
            },
          });
        }
      }

      if (auditLogs.length > 0) {
        await this.auditService.bulkLogActions(auditLogs);
      }
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleNonAccrualBalanceSetup() {
    const currentYear = new Date().getFullYear();
    const policies = await this.leavePolicyService.findAllNonAccrualPolicies(); // you’ll need this

    for (const policy of policies) {
      const employees = await this.companyService.findAllEmployeesInCompany(
        policy.companyId,
      );

      if (!employees || employees.length === 0) continue;

      const superAdmin = await this.db
        .select()
        .from(users)
        .where(eq(users.companyId, policy.companyId))
        .limit(1)
        .execute();

      if (!superAdmin?.[0]) continue;

      const auditLogs: {
        action: string;
        entity: string;
        entityId: string;
        userId: string;
        changes: {
          entitlement: { oldValue: string; newValue: number };
          balance: { oldValue: string; newValue: number };
        };
      }[] = [];

      for (const employee of employees) {
        if (policy.onlyConfirmedEmployees && !employee.confirmed) continue;

        if (
          policy.genderEligibility &&
          policy.genderEligibility !== 'any' &&
          employee.gender !== policy.genderEligibility
        ) {
          continue;
        }

        const existingBalance =
          await this.leaveBalanceService.findBalanceByLeaveType(
            policy.companyId,
            employee.id,
            policy.leaveTypeId,
            currentYear,
          );

        if (!existingBalance) {
          const defaultEntitlement = Number(policy.maxBalance ?? 0);

          const [newBalance] = await this.leaveBalanceService.create(
            policy.leaveTypeId,
            policy.companyId,
            employee.id,
            currentYear,
            defaultEntitlement.toFixed(2),
            '0.00',
            defaultEntitlement.toFixed(2),
          );

          auditLogs.push({
            action: 'non-accrual balance create',
            entity: 'leave_balance',
            entityId: newBalance.id,
            userId: superAdmin[0].id,
            changes: {
              entitlement: {
                oldValue: '0',
                newValue: defaultEntitlement,
              },
              balance: {
                oldValue: '0',
                newValue: defaultEntitlement,
              },
            },
          });
        }
      }

      if (auditLogs.length > 0) {
        await this.auditService.bulkLogActions(auditLogs);
      }
    }
  }
}
