import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateBenefitPlanDto } from './dto/create-benefit-plan.dto';
import { UpdateBenefitPlanDto } from './dto/update-benefit-plan.dto';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { benefitPlans } from '../schema/benefit-plan.schema';
import { benefitEnrollments } from '../schema/benefit-enrollments.schema';
import { employeeProfiles, employees } from 'src/drizzle/schema';
import { EnrollBenefitPlanDto } from './dto/enroll-employee.dto';
import { SingleEnrollBenefitDto } from './dto/single-employee-enroll.dto';
import { differenceInYears, differenceInMonths } from 'date-fns';
import { benefitGroups } from '../schema/benefit-groups.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class BenefitPlanService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ---------- cache keys ----------
  private plansListKey(companyId: string) {
    return `company:${companyId}:benefit-plans:list`;
  }
  private planDetailKey(planId: string) {
    return `benefit-plan:${planId}:detail`;
  }
  private employeeEnrollmentsKey(employeeId: string) {
    return `employee:${employeeId}:benefit-enrollments`;
  }
  private async invalidateAfterPlanChange(companyId: string, planId?: string) {
    const jobs = [this.cache.del(this.plansListKey(companyId))];
    if (planId) jobs.push(this.cache.del(this.planDetailKey(planId)));
    await Promise.allSettled(jobs);
  }
  private async invalidateEmployeeEnrollments(employeeIds: string[]) {
    if (!employeeIds.length) return;
    await Promise.allSettled(
      employeeIds.map((id) => this.cache.del(this.employeeEnrollmentsKey(id))),
    );
  }

  async create(dto: CreateBenefitPlanDto, user: User) {
    const { name, startDate, endDate } = dto;

    const [existingPlan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.name, name),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .execute();

    if (existingPlan) {
      throw new BadRequestException(
        'A benefit plan with this name already exists.',
      );
    }

    if (endDate && new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException(
        'The start date must be before the end date.',
      );
    }

    const [newPlan] = await this.db
      .insert(benefitPlans)
      .values({ ...dto, companyId: user.companyId })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'benefit_plan',
      entityId: newPlan.id,
      userId: user.id,
      details: 'Created a new benefit plan',
      changes: { ...dto, companyId: user.companyId },
    });

    // 🔥 invalidate plan caches
    await this.invalidateAfterPlanChange(user.companyId, newPlan.id);

    return newPlan;
  }

  findAll(companyId: string) {
    return this.cache.getOrSetCache(
      this.plansListKey(companyId),
      async () => {
        return this.db
          .select()
          .from(benefitPlans)
          .where(and(eq(benefitPlans.companyId, companyId)))
          .execute();
      },
      // { ttl: 120 }
    );
  }

  async findOne(id: string) {
    return this.cache.getOrSetCache(
      this.planDetailKey(id),
      async () => {
        const [benefitPlan] = await this.db
          .select()
          .from(benefitPlans)
          .where(eq(benefitPlans.id, id))
          .execute();

        if (!benefitPlan)
          throw new BadRequestException('Benefit plan not found');
        return benefitPlan;
      },
      // { ttl: 300 }
    );
  }

  async update(id: string, dto: UpdateBenefitPlanDto, user: User) {
    const existing = await this.findOne(id);

    if (
      dto.startDate &&
      dto.endDate &&
      new Date(dto.startDate) >= new Date(dto.endDate)
    ) {
      throw new BadRequestException(
        'The start date must be before the end date.',
      );
    }

    const [updatedPlan] = await this.db
      .update(benefitPlans)
      .set({ ...dto, companyId: user.companyId })
      .where(
        and(
          eq(benefitPlans.id, id),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'benefit_plan',
      entityId: updatedPlan.id,
      userId: user.id,
      details: 'Updated a benefit plan',
      changes: { ...dto, companyId: user.companyId },
    });

    // 🔥 invalidate caches
    await this.invalidateAfterPlanChange(user.companyId, existing.id);

    return updatedPlan;
  }

  async remove(id: string, user: User) {
    await this.findOne(id);

    const deleted = await this.db
      .delete(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, id),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'benefit_plan',
      entityId: deleted[0].id,
      userId: user.id,
      details: 'Deleted a benefit plan',
      changes: { ...deleted[0], companyId: user.companyId },
    });

    // 🔥 invalidate caches
    await this.invalidateAfterPlanChange(user.companyId, id);
  }

  private async findEmployeeById(employeeId: string, user: User) {
    const [employee] = await this.db
      .select({
        id: employees.id,
        dateOfBirth: employeeProfiles.dateOfBirth,
        employmentStartDate: employees.employmentStartDate,
        confirmed: employees.confirmed,
      })
      .from(employees)
      .leftJoin(employeeProfiles, eq(employees.id, employeeProfiles.employeeId))
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.companyId, user.companyId),
        ),
      )
      .execute();

    if (!employee) throw new BadRequestException('Employee not found');
    return employee;
  }

  // Get Employee Benefit Enrollments (cached per employee)
  async getEmployeeBenefitEnrollments(employeeId: string, user: User) {
    await this.findEmployeeById(employeeId, user);

    return this.cache.getOrSetCache(
      this.employeeEnrollmentsKey(employeeId),
      async () => {
        const enrollments = await this.db
          .select({
            id: benefitEnrollments.id,
            employeeId: benefitEnrollments.employeeId,
            benefitPlanId: benefitEnrollments.benefitPlanId,
            planName: benefitPlans.name,
            category: benefitPlans.category,
            selectedCoverage: benefitEnrollments.selectedCoverage,
            monthlyCost: sql<string>`(${benefitPlans.cost} ->> ${benefitEnrollments.selectedCoverage})`,
            startDate: benefitPlans.startDate,
            endDate: benefitPlans.endDate,
          })
          .from(benefitEnrollments)
          .innerJoin(
            benefitPlans,
            eq(benefitEnrollments.benefitPlanId, benefitPlans.id),
          )
          .where(
            and(
              eq(benefitEnrollments.employeeId, employeeId),
              eq(benefitPlans.companyId, user.companyId),
              eq(benefitEnrollments.isOptedOut, false),
            ),
          )
          .execute();

        return enrollments;
      },
      // { ttl: 120 }
    );
  }

  // Employee Self-Enrollment
  async selfEnrollToBenefitPlan(
    employeeId: string,
    dto: SingleEnrollBenefitDto,
    user: User,
  ) {
    const [benefitPlan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, dto.benefitPlanId),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .execute();
    if (!benefitPlan) throw new BadRequestException('Benefit plan not found');

    const [benefitGroup] = await this.db
      .select()
      .from(benefitGroups)
      .where(eq(benefitGroups.id, benefitPlan.benefitGroupId))
      .execute();
    if (!benefitGroup) throw new BadRequestException('Benefit group not found');

    const { minAge, minMonths, onlyConfirmed } =
      (benefitGroup.rules as {
        minAge?: number;
        minMonths?: number;
        onlyConfirmed?: boolean;
      }) || {};

    const employee = await this.findEmployeeById(employeeId, user);
    const today = new Date();
    const age = differenceInYears(today, employee.dateOfBirth || new Date());
    const tenureMonths = differenceInMonths(
      today,
      employee.employmentStartDate,
    );
    const confirmedOk = !onlyConfirmed || !!employee.confirmed;

    const messages: string[] = [];
    if (minAge && age < minAge)
      messages.push(`You need to be at least ${minAge} years old to enroll.`);
    if (minMonths && tenureMonths < minMonths)
      messages.push(
        `You need to be employed for at least ${minMonths} months before enrolling. You’ve been with the company for ${tenureMonths} months.`,
      );
    if (!confirmedOk)
      messages.push(
        `Only confirmed employees can enroll in this benefit plan.`,
      );
    if (messages.length) throw new BadRequestException(messages.join(' '));

    const existingEnrollment = await this.db
      .select()
      .from(benefitEnrollments)
      .where(
        and(
          eq(benefitEnrollments.employeeId, employeeId),
          eq(benefitEnrollments.benefitPlanId, dto.benefitPlanId),
          eq(benefitEnrollments.isOptedOut, false),
        ),
      )
      .execute();
    if (existingEnrollment.length > 0)
      throw new BadRequestException(
        'You already enrolled in this benefit plan.',
      );

    await this.db
      .insert(benefitEnrollments)
      .values({
        employeeId,
        benefitPlanId: dto.benefitPlanId,
        selectedCoverage: dto.selectedCoverage,
      })
      .execute();

    await this.auditService.logAction({
      action: 'enroll',
      entity: 'benefit_enrollment',
      entityId: employeeId,
      userId: user.id,
      details: 'Enrolled an employee to a benefit plan',
      changes: {
        employeeId,
        benefitPlanId: dto.benefitPlanId,
        selectedCoverage: dto.selectedCoverage,
        companyId: user.companyId,
      },
    });

    // 🔥 invalidate that employee’s enrollments cache
    await this.invalidateEmployeeEnrollments([employeeId]);
  }

  // Opt Out of Benefit Plan
  async optOutOfBenefitPlan(
    employeeId: string,
    benefitPlanId: string,
    user: User,
  ) {
    const [benefitPlan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, benefitPlanId),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .execute();
    if (!benefitPlan) throw new BadRequestException('Benefit plan not found');

    await this.findEmployeeById(employeeId, user);

    await this.db
      .update(benefitEnrollments)
      .set({ isOptedOut: true })
      .where(
        and(
          eq(benefitEnrollments.employeeId, employeeId),
          eq(benefitEnrollments.benefitPlanId, benefitPlanId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'opt_out',
      entity: 'benefit_enrollment',
      entityId: `${employeeId}`,
      userId: user.id,
      details: 'Employee opted out of a benefit plan',
      changes: { employeeId, benefitPlanId, companyId: user.companyId },
    });

    // 🔥 invalidate that employee’s enrollments cache
    await this.invalidateEmployeeEnrollments([employeeId]);

    return { message: 'Successfully opted out of the benefit plan.' };
  }

  // Assign Employee(s) to Benefit Plan
  async enrollEmployeesToBenefitPlan(dto: EnrollBenefitPlanDto, user: User) {
    const { employeeIds, benefitPlanId } = dto;

    const [benefitPlan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, benefitPlanId),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .execute();
    if (!benefitPlan) throw new BadRequestException('Benefit plan not found');

    for (const employeeId of employeeIds) {
      await this.findEmployeeById(employeeId, user);
    }

    await this.db
      .insert(benefitEnrollments)
      .values(
        employeeIds.map((employeeId) => ({
          employeeId,
          benefitPlanId,
          selectedCoverage: dto.selectedCoverage,
        })),
      )
      .execute();

    for (const employeeId of employeeIds) {
      await this.auditService.logAction({
        action: 'enroll',
        entity: 'benefit_enrollment',
        entityId: `${employeeId}-${benefitPlanId}`,
        userId: user.id,
        details: 'Enrolled an employee to a benefit plan',
        changes: { employeeId, benefitPlanId, companyId: user.companyId },
      });
    }

    // 🔥 invalidate all impacted employees’ enrollments
    await this.invalidateEmployeeEnrollments(employeeIds);

    return {
      message: `Successfully enrolled ${employeeIds.length} employee(s) to the benefit plan.`,
    };
  }

  // Remove Employee(s) from Benefit Plan
  async removeEmployeesFromBenefitPlan(dto: EnrollBenefitPlanDto, user: User) {
    const { employeeIds, benefitPlanId } = dto;

    const [benefitPlan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, benefitPlanId),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .execute();
    if (!benefitPlan) throw new BadRequestException('Benefit plan not found');

    for (const employeeId of employeeIds) {
      await this.findEmployeeById(employeeId, user);
    }

    await Promise.all(
      employeeIds.map((employeeId) =>
        this.db
          .delete(benefitEnrollments)
          .where(
            and(
              eq(benefitEnrollments.employeeId, employeeId),
              eq(benefitEnrollments.benefitPlanId, benefitPlanId),
            ),
          )
          .execute(),
      ),
    );

    for (const employeeId of employeeIds) {
      await this.auditService.logAction({
        action: 'remove',
        entity: 'benefit_enrollment',
        entityId: `${employeeId}-${benefitPlanId}`,
        userId: user.id,
        details: 'Removed an employee from a benefit plan',
        changes: { employeeId, benefitPlanId, companyId: user.companyId },
      });
    }

    // 🔥 invalidate enrollments
    await this.invalidateEmployeeEnrollments(employeeIds);

    return {
      message: `Removed ${employeeIds.length} employee(s) from benefit plan successfully`,
    };
  }
}
