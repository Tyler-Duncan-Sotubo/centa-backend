import { BenefitPlanService } from './benefit-plan.service';
import { CreateBenefitPlanDto } from './dto/create-benefit-plan.dto';
import { UpdateBenefitPlanDto } from './dto/update-benefit-plan.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { EnrollBenefitPlanDto } from './dto/enroll-employee.dto';
import { SingleEnrollBenefitDto } from './dto/single-employee-enroll.dto';
export declare class BenefitPlanController extends BaseController {
    private readonly benefitPlanService;
    constructor(benefitPlanService: BenefitPlanService);
    create(createBenefitPlanDto: CreateBenefitPlanDto, user: User): Promise<void>;
    findAll(user: User): Promise<{
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
    update(id: string, updateBenefitPlanDto: UpdateBenefitPlanDto, user: User): Promise<{
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
    getEmployeeEnrollments(user: User, employeeId: string): Promise<{
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
    getEnrollments(user: User, employeeId: string, dto: SingleEnrollBenefitDto): Promise<void>;
    removeEnrollment(user: User, employeeId: string, benefitPlanId: string): Promise<{
        message: string;
    }>;
    enrollEmployees(enrollBenefitPlanDto: EnrollBenefitPlanDto, user: User): Promise<{
        message: string;
    }>;
    removeEmployeesFromBenefit(dto: EnrollBenefitPlanDto, user: User): Promise<{
        message: string;
    }>;
}
