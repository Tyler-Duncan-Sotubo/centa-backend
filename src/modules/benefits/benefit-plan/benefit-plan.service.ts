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

  private tags(companyId: string) {
    return [
      `company:${companyId}:benefits`,
      `company:${companyId}:benefits:plans`,
      `company:${companyId}:benefits:enrollments`,
    ];
  }

  // ----------------------- Create -----------------------
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

    await this.cache.bumpCompanyVersion(user.companyId);
    return newPlan;
  }

  // ----------------------- Read (all) — cached -----------------------
  findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['benefits', 'plans', 'all'],
      () =>
        this.db
          .select()
          .from(benefitPlans)
          .where(eq(benefitPlans.companyId, companyId))
          .execute(),
      { tags: this.tags(companyId) },
    );
  }

  // ----------------------- Read (one) — cached -----------------------
  async findOne(id: string, companyId?: string) {
    // If companyId is not supplied, fetch it so we can use versioned cache keys.
    let cid = companyId;
    if (!cid) {
      const [row] = await this.db
        .select({ companyId: benefitPlans.companyId })
        .from(benefitPlans)
        .where(eq(benefitPlans.id, id))
        .limit(1)
        .execute();
      cid = row?.companyId;
    }

    if (!cid) {
      throw new BadRequestException('Benefit plan not found');
    }

    return this.cache.getOrSetVersioned(
      cid,
      ['benefits', 'plans', 'one', id],
      async () => {
        const [benefitPlan] = await this.db
          .select()
          .from(benefitPlans)
          .where(and(eq(benefitPlans.id, id), eq(benefitPlans.companyId, cid!)))
          .execute();

        if (!benefitPlan) {
          throw new BadRequestException('Benefit plan not found');
        }
        return benefitPlan;
      },
      { tags: this.tags(cid) },
    );
  }

  // ----------------------- Update -----------------------
  async update(id: string, dto: UpdateBenefitPlanDto, user: User) {
    await this.findOne(id, user.companyId);

    const { startDate, endDate } = dto;
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
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

    await this.cache.bumpCompanyVersion(user.companyId);
    return updatedPlan;
  }

  // ----------------------- Delete -----------------------
  async remove(id: string, user: User) {
    await this.findOne(id, user.companyId);

    const [deletedPlan] = await this.db
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
      entityId: deletedPlan.id,
      userId: user.id,
      details: 'Deleted a benefit plan',
      changes: { ...deletedPlan, companyId: user.companyId },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
  }

  // ----------------------- Helpers -----------------------
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

  // ----------------------- Enrollments (read) — cached per employee -----------------------
  async getEmployeeBenefitEnrollments(employeeId: string, user: User) {
    await this.findEmployeeById(employeeId, user);

    return this.cache.getOrSetVersioned(
      user.companyId,
      ['benefits', 'enrollments', 'employee', employeeId],
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
      { tags: this.tags(user.companyId) },
    );
  }

  // ----------------------- Self enroll -----------------------
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

    const { minAge, minMonths, onlyConfirmed } = (benefitGroup.rules ?? {}) as {
      minAge?: number;
      minMonths?: number;
      onlyConfirmed?: boolean;
    };

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
    if (existingEnrollment.length) {
      throw new BadRequestException(
        'You already enrolled in this benefit plan.',
      );
    }

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

    await this.cache.bumpCompanyVersion(user.companyId);
  }

  // ----------------------- Opt out -----------------------
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

    await this.cache.bumpCompanyVersion(user.companyId);

    return { message: 'Successfully opted out of the benefit plan.' };
  }

  // ----------------------- Bulk enroll -----------------------
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

    for (const employeeId of employeeIds)
      await this.findEmployeeById(employeeId, user);

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

    await this.cache.bumpCompanyVersion(user.companyId);

    return {
      message: `Successfully enrolled ${employeeIds.length} employee(s) to the benefit plan.`,
    };
  }

  // ----------------------- Bulk remove -----------------------
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

    for (const employeeId of employeeIds)
      await this.findEmployeeById(employeeId, user);

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

    await this.cache.bumpCompanyVersion(user.companyId);

    return {
      message: `Removed ${employeeIds.length} employee(s) from benefit plan successfully`,
    };
  }
}
