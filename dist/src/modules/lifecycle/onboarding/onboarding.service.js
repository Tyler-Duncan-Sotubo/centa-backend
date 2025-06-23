"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const config_1 = require("@nestjs/config");
const jwt = require("jsonwebtoken");
const schema_2 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const aws_service_1 = require("../../../common/aws/aws.service");
let OnboardingService = class OnboardingService {
    constructor(db, config, aws) {
        this.db = db;
        this.config = config;
        this.aws = aws;
        this.checklistFieldMap = {
            'Fill Personal Details': [
                'dateOfBirth',
                'gender',
                'maritalStatus',
                'address',
                'country',
                'phone',
                'emergencyName',
                'emergencyPhone',
            ],
            'Fill Basic Personal Details': [
                'dateOfBirth',
                'gender',
                'maritalStatus',
                'address',
                'country',
                'phone',
            ],
            'Complete Basic Info': ['dateOfBirth', 'gender', 'phone'],
            'Fill Out Personal Details': [
                'dateOfBirth',
                'gender',
                'phone',
                'address',
                'country',
            ],
            'Fill Personal Info': ['dateOfBirth', 'gender', 'phone', 'country'],
            'Complete Personal Details': [
                'dateOfBirth',
                'gender',
                'phone',
                'address',
                'country',
                'emergencyName',
            ],
            'Add Bank and Tax Info': [
                'bankName',
                'bankAccountNumber',
                'bankAccountName',
                'bankBranch',
                'currency',
                'tin',
                'pensionPin',
                'nhfNumber',
            ],
            'Submit Tax and Banking Info': [
                'bankName',
                'bankAccountNumber',
                'bankAccountName',
                'bankBranch',
                'tin',
                'pensionPin',
                'nhfNumber',
            ],
            'Complete Tax and Payment Setup': [
                'tin',
                'bankAccountNumber',
                'bankAccountName',
                'currency',
            ],
            'Upload Valid ID': ['idUpload'],
            'Upload Student ID': ['idUpload'],
            'Upload Signed Contract': ['idUpload'],
            'Submit Medical Certifications': ['idUpload'],
            'Add Dependents (Optional)': [],
            'Upload Certifications (If Any)': [],
            'Submit Social Media Handles (Optional)': [],
        };
    }
    generateToken(payload) {
        const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
        return jwt.sign(payload, jwtSecret, {
            expiresIn: '5d',
        });
    }
    async assignOnboardingTemplate(employeeId, templateId, companyId, trx) {
        const db = trx ?? this.db;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        const token = this.generateToken({ employeeId });
        await db.transaction(async (tx) => {
            await tx.insert(schema_1.employeeOnboarding).values({
                employeeId,
                templateId,
                status: 'pending',
                startedAt: now,
                companyId,
            });
            await tx.insert(schema_1.employeeLifecycleTokens).values({
                employeeId,
                token,
                type: 'onboarding',
                expiresAt,
            });
            const checklist = await tx
                .select({
                id: schema_1.onboardingTemplateChecklists.id,
                dueAfter: schema_1.onboardingTemplateChecklists.dueDaysAfterStart,
            })
                .from(schema_1.onboardingTemplateChecklists)
                .where((0, drizzle_orm_1.eq)(schema_1.onboardingTemplateChecklists.templateId, templateId));
            if (checklist.length) {
                const statusRows = checklist.map((c) => ({
                    employeeId,
                    checklistId: c.id,
                    status: 'pending',
                }));
                await tx.insert(schema_1.employeeChecklistStatus).values(statusRows);
            }
        });
    }
    async getEmployeesInOnboarding(companyId) {
        const onboardingData = await this.db
            .select({
            employeeId: schema_2.employees.id,
            employeeName: (0, drizzle_orm_1.sql) `${schema_2.employees.firstName} || ' ' || ${schema_2.employees.lastName}`.as('employeeName'),
            email: schema_2.employees.email,
            templateId: schema_1.employeeOnboarding.templateId,
            status: schema_1.employeeOnboarding.status,
            startedAt: schema_1.employeeOnboarding.startedAt,
        })
            .from(schema_1.employeeOnboarding)
            .innerJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_2.employees.id, schema_1.employeeOnboarding.employeeId))
            .where((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.employeeOnboarding.startedAt))
            .execute();
        const withChecklist = await Promise.all(onboardingData.map(async (entry) => {
            const checklistItems = await this.db
                .select({
                id: schema_1.onboardingTemplateChecklists.id,
                title: schema_1.onboardingTemplateChecklists.title,
                assignee: schema_1.onboardingTemplateChecklists.assignee,
                order: schema_1.onboardingTemplateChecklists.order,
                dueDaysAfterStart: schema_1.onboardingTemplateChecklists.dueDaysAfterStart,
                status: schema_1.employeeChecklistStatus.status,
                completedAt: schema_1.employeeChecklistStatus.completedAt,
            })
                .from(schema_1.onboardingTemplateChecklists)
                .leftJoin(schema_1.employeeChecklistStatus, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.checklistId, schema_1.onboardingTemplateChecklists.id), (0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, entry.employeeId)))
                .where((0, drizzle_orm_1.eq)(schema_1.onboardingTemplateChecklists.templateId, entry.templateId))
                .orderBy(schema_1.onboardingTemplateChecklists.order);
            return {
                ...entry,
                checklist: checklistItems,
            };
        }));
        return withChecklist;
    }
    async getEmployeeOnboardingDetail(companyId, employeeId) {
        const row = await this.db
            .select({
            employeeId: schema_2.employees.id,
            employeeName: (0, drizzle_orm_1.sql) `${schema_2.employees.firstName} || ' ' || ${schema_2.employees.lastName}`.as('employeeName'),
            email: schema_2.employees.email,
            templateId: schema_1.employeeOnboarding.templateId,
            status: schema_1.employeeOnboarding.status,
            startedAt: schema_1.employeeOnboarding.startedAt,
        })
            .from(schema_1.employeeOnboarding)
            .innerJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_2.employees.id, schema_1.employeeOnboarding.employeeId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId)))
            .limit(1)
            .execute()
            .then((r) => r[0]);
        if (!row)
            throw new common_1.BadRequestException('Employee is not currently in an onboarding flow');
        const checklist = await this.db.query.onboardingTemplateChecklists.findMany({
            where: (c, { eq }) => eq(c.templateId, row.templateId),
            orderBy: (c, { asc }) => asc(c.order),
        });
        const templateFields = await this.db.query.onboardingTemplateFields.findMany({
            where: (f, { eq }) => eq(f.templateId, row.templateId),
        });
        const checklistWithFields = checklist.map((item) => ({
            ...item,
            fields: (this.checklistFieldMap[item.title] || [])
                .map((key) => templateFields.find((f) => f.fieldKey === key))
                .filter(Boolean),
        }));
        return { ...row, checklist: checklistWithFields };
    }
    async saveEmployeeOnboardingData(employeeId, payload) {
        const profileFields = {
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender,
            maritalStatus: payload.maritalStatus,
            address: payload.address,
            country: payload.country,
            phone: payload.phone,
            emergencyName: payload.emergencyName,
            emergencyPhone: payload.emergencyPhone,
        };
        const financialFields = {
            bankName: payload.bankName,
            bankAccountNumber: payload.bankAccountNumber,
            bankAccountName: payload.bankAccountName,
            bankBranch: payload.bankBranch,
            currency: payload.currency ?? 'NGN',
            tin: payload.tin,
            pensionPin: payload.pensionPin,
            nhfNumber: payload.nhfNumber,
        };
        await this.db
            .insert(schema_2.employeeProfiles)
            .values({ ...profileFields, employeeId })
            .execute();
        await this.db
            .insert(schema_2.employeeFinancials)
            .values({ ...financialFields, employeeId })
            .execute();
        if (payload.idUpload) {
            const [meta, base64Data] = payload.idUpload.split(',');
            const isPdf = meta.includes('application/pdf');
            const fileExt = isPdf ? 'pdf' : meta.includes('png') ? 'png' : 'jpg';
            const fileName = `id-${employeeId}-${Date.now()}.${fileExt}`;
            const { email } = await this.db
                .select({ email: schema_2.employees.email })
                .from(schema_2.employees)
                .where((0, drizzle_orm_1.eq)(schema_2.employees.id, employeeId))
                .limit(1)
                .then((r) => r[0]);
            let fileUrl;
            if (isPdf) {
                const pdfBuffer = Buffer.from(base64Data, 'base64');
                fileUrl = await this.aws.uploadPdfToS3(email, fileName, pdfBuffer);
            }
            else {
                fileUrl = await this.aws.uploadImageToS3(email, fileName, payload.idUpload);
            }
            await this.db.insert(schema_2.employeeDocuments).values({
                employeeId,
                type: isPdf ? 'id_upload' : 'image_upload',
                fileName,
                fileUrl,
            });
        }
        const { templateId } = await this.db
            .select({ templateId: schema_1.employeeOnboarding.templateId })
            .from(schema_1.employeeOnboarding)
            .where((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId))
            .limit(1)
            .then((r) => r[0]);
        await this.upsertChecklistProgress(employeeId, templateId, payload);
        const outstanding = await this.db
            .select({ cnt: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.employeeChecklistStatus)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.ne)(schema_1.employeeChecklistStatus.status, 'completed')))
            .then((r) => r[0].cnt);
        if (outstanding === 0) {
            await this.db
                .update(schema_1.employeeOnboarding)
                .set({ status: 'completed', completedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId));
        }
        return { success: true };
    }
    async upsertChecklistProgress(employeeId, templateId, payload) {
        const templateChecklist = await this.db.query.onboardingTemplateChecklists.findMany({
            where: (c, { eq }) => eq(c.templateId, templateId),
        });
        const now = new Date();
        for (const item of templateChecklist) {
            const fieldKeys = this.checklistFieldMap[item.title] ?? [];
            const satisfied = fieldKeys.length > 0 &&
                fieldKeys.every((k) => k === 'idUpload'
                    ? Boolean(payload.idUpload)
                    : payload[k] != null &&
                        payload[k] !== '');
            if (!satisfied)
                continue;
            if (satisfied) {
                await this.db
                    .update(schema_1.employeeChecklistStatus)
                    .set({
                    status: 'completed',
                    completedAt: now,
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.checklistId, item.id)));
                await this.db
                    .update(schema_2.employees)
                    .set({
                    employmentStatus: 'active',
                })
                    .where((0, drizzle_orm_1.eq)(schema_2.employees.id, employeeId));
            }
            const [{ remaining }] = await this.db
                .select({ remaining: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.employeeChecklistStatus)
                .innerJoin(schema_1.onboardingTemplateChecklists, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.onboardingTemplateChecklists.id, schema_1.employeeChecklistStatus.checklistId), (0, drizzle_orm_1.eq)(schema_1.onboardingTemplateChecklists.templateId, templateId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.ne)(schema_1.employeeChecklistStatus.status, 'completed')))
                .execute();
            if (remaining === 0) {
                await this.db
                    .update(schema_1.employeeOnboarding)
                    .set({ status: 'completed', completedAt: now })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.templateId, templateId)));
            }
        }
    }
    async updateChecklistStatus(employeeId, checklistId, status) {
        const now = new Date();
        return this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(schema_1.employeeChecklistStatus)
                .set({
                status,
                completedAt: status === 'completed' ? now : null,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.checklistId, checklistId)))
                .returning();
            const [{ remaining }] = await tx
                .select({ remaining: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.employeeChecklistStatus)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.ne)(schema_1.employeeChecklistStatus.status, 'completed')))
                .execute();
            console.log(remaining);
            if (Number(remaining) === 0) {
                console.log(`All checklist items completed for employee ${employeeId}. Marking onboarding as completed.`);
                await tx
                    .update(schema_1.employeeOnboarding)
                    .set({
                    status: 'completed',
                    completedAt: now,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId))
                    .execute();
            }
            return updated;
        });
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService,
        aws_service_1.AwsService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map