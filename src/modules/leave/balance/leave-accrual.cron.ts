import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';

import { LeavePolicyService } from '../policy/leave-policy.service';
import { LeaveBalanceService } from './leave-balance.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { CompanyService } from 'src/modules/core/company/company.service';

import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { users } from '../../auth/schema';

@Injectable()
export class LeaveAccrualCronService {
  private readonly logger = new Logger(LeaveAccrualCronService.name);

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
    const companies = await this.companyService.getAllCompanies();
    if (!companies?.length) {
      this.logger.log('No companies found; skipping monthly accruals.');
      return;
    }

    for (const company of companies) {
      const companyId = company.id;
      try {
        const policies =
          await this.leavePolicyService.findAllAccrualPolicies(companyId);
        const monthlyPolicies = policies.filter(
          (p) => p.accrualFrequency === 'monthly',
        );
        if (!monthlyPolicies.length) {
          this.logger.log(
            `No monthly accrual policies for company ${companyId}`,
          );
          continue;
        }

        const employees =
          await this.companyService.findAllEmployeesInCompany(companyId);
        if (!employees?.length) {
          this.logger.log(`No employees for company ${companyId}`);
          continue;
        }

        const [actor] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.companyId, companyId))
          .limit(1)
          .execute();
        const actorId = actor?.id ?? 'system';

        const auditLogs: Array<{
          action: string;
          entity: string;
          entityId: string;
          userId: string;
          changes: {
            entitlement: { oldValue: string; newValue: number };
            balance: { oldValue: string; newValue: number };
          };
        }> = [];

        for (const policy of monthlyPolicies) {
          for (const employee of employees) {
            if (policy.onlyConfirmedEmployees && !employee.confirmed) continue;

            const existing =
              await this.leaveBalanceService.findBalanceByLeaveType(
                companyId,
                employee.id,
                policy.leaveTypeId,
                currentYear,
              );

            if (existing) {
              const entitlementNum = Number(existing.entitlement) || 0;
              const accrualNum = Number(policy.accrualAmount) || 0;
              const newEntitlement = entitlementNum + accrualNum;
              const usedNum = Number(existing.used) || 0;
              const newBalance = newEntitlement - usedNum;

              await this.leaveBalanceService.update(existing.id, {
                entitlement: newEntitlement.toFixed(2),
                balance: newBalance.toFixed(2),
              });

              auditLogs.push({
                action: 'system accrual update',
                entity: 'leave_balance',
                entityId: existing.id,
                userId: actorId,
                changes: {
                  entitlement: {
                    oldValue: existing.entitlement,
                    newValue: newEntitlement,
                  },
                  balance: { oldValue: existing.balance, newValue: newBalance },
                },
              });
            } else {
              const initial = Number(policy.accrualAmount) || 0;
              const [created] = await this.leaveBalanceService.create(
                policy.leaveTypeId,
                companyId,
                employee.id,
                currentYear,
                initial.toFixed(2),
                '0.00',
                initial.toFixed(2),
              );

              auditLogs.push({
                action: 'system accrual create',
                entity: 'leave_balance',
                entityId: created.id,
                userId: actorId,
                changes: {
                  entitlement: { oldValue: '0', newValue: initial },
                  balance: { oldValue: '0', newValue: initial },
                },
              });
            }
          }
        }

        if (auditLogs.length) {
          await this.auditService.bulkLogActions(auditLogs);
        }

        this.logger.log(`Monthly accruals completed for company ${companyId}`);
      } catch (err) {
        this.logger.error(
          `Accruals failed for company ${companyId}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleNonAccrualBalanceSetup() {
    const currentYear = new Date().getFullYear();
    const companies = await this.companyService.getAllCompanies();
    if (!companies?.length) {
      this.logger.log('No companies found; skipping non-accrual setup.');
      return;
    }

    for (const company of companies) {
      const companyId = company.id;
      try {
        const policies =
          await this.leavePolicyService.findAllNonAccrualPolicies(companyId);
        if (!policies?.length) {
          this.logger.log(`No non-accrual policies for company ${companyId}`);
          continue;
        }

        const employees =
          await this.companyService.findAllEmployeesInCompany(companyId);
        if (!employees?.length) {
          this.logger.log(`No employees for company ${companyId}`);
          continue;
        }

        const [actor] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.companyId, companyId))
          .limit(1)
          .execute();
        const actorId = actor?.id ?? 'system';

        const auditLogs: Array<{
          action: string;
          entity: string;
          entityId: string;
          userId: string;
          changes: {
            entitlement: { oldValue: string; newValue: number };
            balance: { oldValue: string; newValue: number };
          };
        }> = [];

        for (const policy of policies) {
          for (const employee of employees) {
            if (policy.onlyConfirmedEmployees && !employee.confirmed) continue;

            if (
              policy.genderEligibility &&
              policy.genderEligibility !== 'any' &&
              employee.gender !== policy.genderEligibility
            ) {
              continue;
            }

            const existing =
              await this.leaveBalanceService.findBalanceByLeaveType(
                companyId,
                employee.id,
                policy.leaveTypeId,
                currentYear,
              );

            if (!existing) {
              const defaultEntitlement = Number(policy.maxBalance ?? 0);
              const [created] = await this.leaveBalanceService.create(
                policy.leaveTypeId,
                companyId,
                employee.id,
                currentYear,
                defaultEntitlement.toFixed(2),
                '0.00',
                defaultEntitlement.toFixed(2),
              );

              auditLogs.push({
                action: 'non-accrual balance create',
                entity: 'leave_balance',
                entityId: created.id,
                userId: actorId,
                changes: {
                  entitlement: { oldValue: '0', newValue: defaultEntitlement },
                  balance: { oldValue: '0', newValue: defaultEntitlement },
                },
              });
            }
          }
        }

        if (auditLogs.length) {
          await this.auditService.bulkLogActions(auditLogs);
        }

        this.logger.log(
          `Non-accrual balance setup completed for company ${companyId}`,
        );
      } catch (err) {
        this.logger.error(
          `Non-accrual setup failed for company ${companyId}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }
  }
}
