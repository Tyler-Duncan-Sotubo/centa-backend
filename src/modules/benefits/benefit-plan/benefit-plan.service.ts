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

@Injectable()
export class BenefitPlanService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateBenefitPlanDto, user: User) {
    const { name, startDate, endDate } = dto;

    // check if the plan name already exists
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

    if (new Date(startDate) >= new Date(endDate ? endDate : '')) {
      throw new BadRequestException(
        'The start date must be before the end date.',
      );
    }

    // create the new benefit plan
    const [newPlan] = await this.db
      .insert(benefitPlans)
      .values({
        ...dto,
        companyId: user.companyId,
      })
      .returning()
      .execute();

    // log the creation of the new benefit plan
    await this.auditService.logAction({
      action: 'create',
      entity: 'benefit_plan',
      entityId: newPlan.id,
      userId: user.id,
      details: 'Created a new benefit plan',
      changes: {
        ...dto,
        companyId: user.companyId,
      },
    });
  }

  findAll(companyId: string) {
    return this.db
      .select()
      .from(benefitPlans)
      .where(and(eq(benefitPlans.companyId, companyId)))
      .execute();
  }

  async findOne(id: string) {
    const [benefitPlan] = await this.db
      .select()
      .from(benefitPlans)
      .where(eq(benefitPlans.id, id))
      .execute();

    if (!benefitPlan) {
      throw new BadRequestException('Benefit plan not found');
    }
    return benefitPlan;
  }

  async update(id: string, dto: UpdateBenefitPlanDto, user: User) {
    const { startDate, endDate } = dto;

    // check if the plan name already exists
    await this.findOne(id);

    // check if the start date is before the end date
    if (
      new Date(startDate ? startDate : '') >= new Date(endDate ? endDate : '')
    ) {
      throw new BadRequestException(
        'The start date must be before the end date.',
      );
    }

    // update the benefit plan
    const [updatedPlan] = await this.db
      .update(benefitPlans)
      .set({
        ...dto,
        companyId: user.companyId,
      })
      .where(
        and(
          eq(benefitPlans.id, id),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    // log the update of the benefit plan
    await this.auditService.logAction({
      action: 'update',
      entity: 'benefit_plan',
      entityId: updatedPlan.id,
      userId: user.id,
      details: 'Updated a benefit plan',
      changes: {
        ...dto,
        companyId: user.companyId,
      },
    });

    return updatedPlan;
  }

  async remove(id: string, user: User) {
    await this.findOne(id);
    const deletedPlan = await this.db
      .delete(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, id),
          eq(benefitPlans.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    // log the deletion of the benefit plan
    await this.auditService.logAction({
      action: 'delete',
      entity: 'benefit_plan',
      entityId: deletedPlan[0].id,
      userId: user.id,
      details: 'Deleted a benefit plan',
      changes: {
        ...deletedPlan[0],
        companyId: user.companyId,
      },
    });
  }

  private async findEmployeeById(employeeId: string, user: User) {
    // check if the employee exists
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

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    return employee;
  }

  // Get Employee Benefit Enrollments
  async getEmployeeBenefitEnrollments(employeeId: string, user: User) {
    await this.findEmployeeById(employeeId, user);

    const enrollments = await this.db
      .select({
        id: benefitEnrollments.id,
        employeeId: benefitEnrollments.employeeId,
        benefitPlanId: benefitEnrollments.benefitPlanId,
        planName: benefitPlans.name,
        category: benefitPlans.category,
        selectedCoverage: benefitEnrollments.selectedCoverage,
        // 👉 pull just the chosen tier’s price
        monthlyCost: sql<string>`
          (${benefitPlans.cost} ->> ${benefitEnrollments.selectedCoverage})
        `,
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
  }

  // Employee Self-Enrollment
  async selfEnrollToBenefitPlan(
    employeeId: string,
    dto: SingleEnrollBenefitDto,
    user: User,
  ) {
    // ──────────────────── 1. Check plan belongs to this company ────────────────────
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

    if (!benefitPlan) {
      throw new BadRequestException('Benefit plan not found');
    }

    // ──────────────────── 2. Load benefit group + rules ────────────────────────────
    const [benefitGroup] = await this.db
      .select()
      .from(benefitGroups)
      .where(eq(benefitGroups.id, benefitPlan.benefitGroupId))
      .execute();

    if (!benefitGroup) {
      throw new BadRequestException('Benefit group not found');
    }

    const { minAge, minMonths, onlyConfirmed } = benefitGroup.rules as {
      minAge?: number;
      minMonths?: number;
      onlyConfirmed?: boolean;
    };

    // ──────────────────── 3. Fetch employee & derive age/tenure ────────────────────
    const employee = await this.findEmployeeById(employeeId, user); // already checks company

    const today = new Date();
    const age = differenceInYears(today, employee.dateOfBirth || new Date());
    const tenureMonths = differenceInMonths(
      today,
      employee.employmentStartDate,
    );
    const confirmedOk = !onlyConfirmed || !!employee.confirmed;

    // ──────────────────── 4. Eligibility checks ────────────────────────────────────
    const messages: string[] = [];

    if (minAge && age < minAge) {
      messages.push(`You need to be at least ${minAge} years old to enroll.`);
    }

    if (minMonths && tenureMonths < minMonths) {
      messages.push(
        `You need to be employed for at least ${minMonths} months before enrolling. You’ve been with the company for ${tenureMonths} months.`,
      );
    }

    if (!confirmedOk) {
      messages.push(
        `Only confirmed employees can enroll in this benefit plan.`,
      );
    }

    if (messages.length > 0) {
      throw new BadRequestException(messages.join(' '));
    }
    // ──────────────────── 5. Already-enrolled check (unchanged) ────────────────────
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

    if (existingEnrollment.length > 0) {
      throw new BadRequestException(
        'You already enrolled in this benefit plan.',
      );
    }

    // ──────────────────── 6. Insert & audit (unchanged) ────────────────────────────
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
  }

  // Opt Out of Benefit Plan
  async optOutOfBenefitPlan(
    employeeId: string,
    benefitPlanId: string,
    user: User,
  ) {
    // Validate the benefit plan
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

    if (!benefitPlan) {
      throw new BadRequestException('Benefit plan not found');
    }

    // Validate the employee exists
    await this.findEmployeeById(employeeId, user);

    // Delete the enrollment
    await this.db
      .update(benefitEnrollments)
      .set({
        isOptedOut: true,
      })
      .where(
        and(
          eq(benefitEnrollments.employeeId, employeeId),
          eq(benefitEnrollments.benefitPlanId, benefitPlanId),
        ),
      )
      .execute();

    // Log the opt-out action
    await this.auditService.logAction({
      action: 'opt_out',
      entity: 'benefit_enrollment',
      entityId: `${employeeId}`,
      userId: user.id,
      details: 'Employee opted out of a benefit plan',
      changes: {
        employeeId,
        benefitPlanId,
        companyId: user.companyId,
      },
    });

    return {
      message: 'Successfully opted out of the benefit plan.',
    };
  }

  // Assign Employee to Benefit Plan
  async enrollEmployeesToBenefitPlan(dto: EnrollBenefitPlanDto, user: User) {
    const { employeeIds, benefitPlanId } = dto;

    // Validate the benefit plan
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

    if (!benefitPlan) {
      throw new BadRequestException('Benefit plan not found');
    }

    // Check each employee exists
    for (const employeeId of employeeIds) {
      await this.findEmployeeById(employeeId, user);
    }

    // Assign all employees to the plan
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

    // Log each enrollment
    for (const employeeId of employeeIds) {
      await this.auditService.logAction({
        action: 'enroll',
        entity: 'benefit_enrollment',
        entityId: `${employeeId}-${benefitPlanId}`,
        userId: user.id,
        details: 'Enrolled an employee to a benefit plan',
        changes: {
          employeeId,
          benefitPlanId,
          companyId: user.companyId,
        },
      });
    }

    return {
      message: `Successfully enrolled ${employeeIds.length} employee(s) to the benefit plan.`,
    };
  }

  // Remove Employee from Benefit Plan
  async removeEmployeesFromBenefitPlan(dto: EnrollBenefitPlanDto, user: User) {
    const { employeeIds, benefitPlanId } = dto;

    // Validate benefit plan
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

    if (!benefitPlan) {
      throw new BadRequestException('Benefit plan not found');
    }

    // Validate all employee IDs
    for (const employeeId of employeeIds) {
      await this.findEmployeeById(employeeId, user);
    }

    // Delete enrollments in batch
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

    // Log each removal
    for (const employeeId of employeeIds) {
      await this.auditService.logAction({
        action: 'remove',
        entity: 'benefit_enrollment',
        entityId: `${employeeId}-${benefitPlanId}`,
        userId: user.id,
        details: 'Removed an employee from a benefit plan',
        changes: {
          employeeId,
          benefitPlanId,
          companyId: user.companyId,
        },
      });
    }

    return {
      message: `Removed ${employeeIds.length} employee(s) from benefit plan successfully`,
    };
  }
}
