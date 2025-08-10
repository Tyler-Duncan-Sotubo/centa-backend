import { CreateBenefitPlanDto } from './dto/create-benefit-plan.dto';
import { UpdateBenefitPlanDto } from './dto/update-benefit-plan.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { EnrollBenefitPlanDto } from './dto/enroll-employee.dto';
import { SingleEnrollBenefitDto } from './dto/single-employee-enroll.dto';
import { CacheService } from 'src/common/cache/cache.service';
export declare class BenefitPlanService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private plansListKey;
    private planDetailKey;
    private employeeEnrollmentsKey;
    private invalidateAfterPlanChange;
    private invalidateEmployeeEnrollments;
    create(dto: CreateBenefitPlanDto, user: User): Promise<{
        id: string;
        name: string;
        split: string;
        createdAt: Date | null;
        companyId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        category: string;
        benefitGroupId: string;
        coverageOptions: unknown;
        cost: unknown;
        employerContribution: number | null;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        companyId: string;
        benefitGroupId: string;
        name: string;
        description: string | null;
        category: string;
        coverageOptions: unknown;
        cost: unknown;
        startDate: Date;
        endDate: Date | null;
        createdAt: Date | null;
        split: string;
        employerContribution: number | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        companyId: string;
        benefitGroupId: string;
        name: string;
        description: string | null;
        category: string;
        coverageOptions: unknown;
        cost: unknown;
        startDate: Date;
        endDate: Date | null;
        createdAt: Date | null;
        split: string;
        employerContribution: number | null;
    }>;
    update(id: string, dto: UpdateBenefitPlanDto, user: User): Promise<{
        id: string;
        companyId: string;
        benefitGroupId: string;
        name: string;
        description: string | null;
        category: string;
        coverageOptions: unknown;
        cost: unknown;
        startDate: Date;
        endDate: Date | null;
        createdAt: Date | null;
        split: string;
        employerContribution: number | null;
    }>;
    remove(id: string, user: User): Promise<void>;
    private findEmployeeById;
    getEmployeeBenefitEnrollments(employeeId: string, user: User): Promise<{
        id: string;
        employeeId: string;
        benefitPlanId: string;
        planName: string;
        category: string;
        selectedCoverage: string;
        monthlyCost: string;
        startDate: Date;
        endDate: Date | null;
    }[]>;
    selfEnrollToBenefitPlan(employeeId: string, dto: SingleEnrollBenefitDto, user: User): Promise<void>;
    optOutOfBenefitPlan(employeeId: string, benefitPlanId: string, user: User): Promise<{
        message: string;
    }>;
    enrollEmployeesToBenefitPlan(dto: EnrollBenefitPlanDto, user: User): Promise<{
        message: string;
    }>;
    removeEmployeesFromBenefitPlan(dto: EnrollBenefitPlanDto, user: User): Promise<{
        message: string;
    }>;
}
