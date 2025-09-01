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
        this.norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        this.exactTitleMap = {
            'fill personal details': [
                'dateOfBirth',
                'gender',
                'maritalStatus',
                'address',
                'country',
                'phone',
                'emergencyName',
                'emergencyPhone',
            ],
            'fill basic personal details': [
                'dateOfBirth',
                'gender',
                'maritalStatus',
                'address',
                'country',
                'phone',
            ],
            'complete basic info': ['dateOfBirth', 'gender', 'phone'],
            'fill out personal details': [
                'dateOfBirth',
                'gender',
                'phone',
                'address',
                'country',
            ],
            'fill personal info': ['dateOfBirth', 'gender', 'phone', 'country'],
            'complete personal details': [
                'dateOfBirth',
                'gender',
                'phone',
                'address',
                'country',
                'emergencyName',
            ],
            'add bank and tax info': [
                'bankName',
                'bankAccountNumber',
                'bankAccountName',
                'bankBranch',
                'currency',
                'tin',
                'pensionPin',
                'nhfNumber',
            ],
            'submit tax and banking info': [
                'bankName',
                'bankAccountNumber',
                'bankAccountName',
                'bankBranch',
                'tin',
                'pensionPin',
                'nhfNumber',
            ],
            'complete tax and payment setup': [
                'tin',
                'bankAccountNumber',
                'bankAccountName',
                'currency',
            ],
            'upload valid id': ['idUpload'],
            'upload student id': ['idUpload'],
            'upload signed contract': ['idUpload'],
            'submit medical certifications': ['idUpload'],
            'add dependents (optional)': [],
            'upload certifications (if any)': [],
            'submit social media handles (optional)': [],
        };
        this.TITLE_RULES = [
            {
                test: (t) => /(personal|profile|basic info|details)/i.test(t),
                tag: 'profile',
            },
            {
                test: (t) => /(bank|tax|payment|finance|pension|nhf)/i.test(t),
                tag: 'finance',
            },
            {
                test: (t) => /(upload|id|contract|certificate|certification)/i.test(t),
                tag: 'uploads',
            },
        ];
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
        const templateFieldsRaw = await this.db.query.onboardingTemplateFields.findMany({
            where: (f, { eq }) => eq(f.templateId, row.templateId),
        });
        const templateFields = templateFieldsRaw.map((f) => ({
            ...f,
            order: f.order === null ? undefined : f.order,
        }));
        const checklistWithFields = checklist.map((item) => ({
            ...item,
            fields: this.resolveChecklistFields(item.title, templateFields),
        }));
        return { ...row, checklist: checklistWithFields };
    }
    async saveEmployeeOnboardingData(employeeId, payload) {
        const onboardingRow = await this.db
            .select({
            templateId: schema_1.employeeOnboarding.templateId,
            companyId: schema_1.employeeOnboarding.companyId,
        })
            .from(schema_1.employeeOnboarding)
            .where((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId))
            .limit(1)
            .then((r) => r[0]);
        if (!onboardingRow)
            throw new common_1.BadRequestException('Onboarding not found');
        const { templateId } = onboardingRow;
        const idUploadRequired = await this.db.query.onboardingTemplateFields.findFirst({
            where: (f, { and, eq }) => and(eq(f.templateId, templateId), eq(f.fieldKey, 'idUpload'), eq(f.required, true)),
        });
        if (idUploadRequired && !payload.idUpload) {
            throw new common_1.BadRequestException('ID upload is required for this onboarding.');
        }
        const profileFields = {
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender,
            maritalStatus: payload.maritalStatus,
            address: payload.address,
            country: payload.country,
            phone: payload.phone,
            emergencyName: payload.emergencyName,
            emergencyPhone: payload.emergencyPhone,
            employeeId,
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
            employeeId,
        };
        await this.db.insert(schema_2.employeeProfiles).values(profileFields).execute();
        await this.db.insert(schema_2.employeeFinancials).values(financialFields).execute();
        if (payload.idUpload) {
            const upload = payload.idUpload;
            const emp = await this.db
                .select({ email: schema_2.employees.email })
                .from(schema_2.employees)
                .where((0, drizzle_orm_1.eq)(schema_2.employees.id, employeeId))
                .limit(1)
                .then((r) => r[0]);
            if (!emp)
                throw new common_1.BadRequestException('Employee not found');
            const { email } = emp;
            let fileUrl = null;
            let fileName = `id-${employeeId}-${Date.now()}`;
            let docType = 'image_upload';
            if (typeof upload === 'string') {
                if (upload.startsWith('data:')) {
                    const commaIdx = upload.indexOf(',');
                    if (commaIdx === -1) {
                        throw new common_1.BadRequestException('Invalid data URL for idUpload.');
                    }
                    const meta = upload.slice(5, commaIdx);
                    const base64Data = upload.slice(commaIdx + 1);
                    const isPdf = /application\/pdf/i.test(meta);
                    const isPng = /image\/png/i.test(meta);
                    const isJpg = /image\/jpe?g/i.test(meta);
                    const ext = isPdf ? 'pdf' : isPng ? 'png' : isJpg ? 'jpg' : 'bin';
                    fileName = `${fileName}.${ext}`;
                    docType = isPdf ? 'id_upload' : 'image_upload';
                    if (isPdf) {
                        const pdfBuffer = Buffer.from(base64Data, 'base64');
                        fileUrl = await this.aws.uploadPdfToS3(email, fileName, pdfBuffer);
                    }
                    else {
                        fileUrl = await this.aws.uploadImageToS3(email, fileName, upload);
                    }
                }
                else if (/^https?:\/\//i.test(upload)) {
                    fileUrl = upload;
                    if (upload.endsWith('.pdf'))
                        docType = 'id_upload';
                }
                else {
                    fileUrl = upload;
                }
            }
            else if (upload &&
                typeof upload === 'object' &&
                'buffer' in upload) {
                const u = upload;
                const isPdf = /pdf/i.test(u.mimetype || '');
                const ext = isPdf ? 'pdf' : 'bin';
                fileName = `${fileName}.${ext}`;
                docType = isPdf ? 'id_upload' : 'image_upload';
                fileUrl = await this.aws.uploadPdfToS3(email, fileName, u.buffer);
            }
            if (fileUrl) {
                await this.db
                    .insert(schema_2.employeeDocuments)
                    .values({
                    employeeId,
                    type: docType,
                    fileName,
                    fileUrl,
                })
                    .execute();
            }
        }
        await this.upsertChecklistProgress(employeeId, templateId, payload);
        return { success: true };
    }
    async upsertChecklistProgress(employeeId, templateId, payload) {
        const now = new Date();
        await this.db.transaction(async (tx) => {
            const [templateChecklist, templateFields] = await Promise.all([
                tx.query.onboardingTemplateChecklists.findMany({
                    where: (c, { eq }) => eq(c.templateId, templateId),
                }),
                tx.query.onboardingTemplateFields.findMany({
                    where: (f, { eq }) => eq(f.templateId, templateId),
                }),
            ]);
            const keysByTag = {};
            for (const f of templateFields) {
                if (f.tag)
                    (keysByTag[f.tag] ??= []).push(f.fieldKey);
            }
            const checklistIds = templateChecklist.map((it) => it.id);
            const existingRows = await tx.query.employeeChecklistStatus.findMany({
                where: (s, { and, eq, inArray }) => and(eq(s.employeeId, employeeId), inArray(s.checklistId, checklistIds)),
            });
            const byChecklistId = new Map(existingRows.map((r) => [r.checklistId, r]));
            let anyCompletedThisRun = false;
            for (const item of templateChecklist) {
                const statusRow = byChecklistId.get(item.id);
                if (!statusRow) {
                    continue;
                }
                const fromMap = this.checklistFieldMap?.[item.title] ?? [];
                const tag = this.inferTagFromTitle(item.title);
                const inferred = tag ? (keysByTag[tag] ?? []) : [];
                const fieldKeys = fromMap.length ? fromMap : inferred;
                const satisfied = fieldKeys.length > 0 &&
                    fieldKeys.every((k) => {
                        if (k === 'idUpload')
                            return !!payload.idUpload;
                        const v = payload[k];
                        return v !== undefined && v !== null && String(v).trim() !== '';
                    });
                const newStatus = satisfied
                    ? 'completed'
                    : 'pending';
                if (statusRow.status !== newStatus) {
                    await tx
                        .update(schema_1.employeeChecklistStatus)
                        .set({
                        status: newStatus,
                        completedAt: satisfied ? now : (statusRow.completedAt ?? null),
                    })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.checklistId, item.id)))
                        .execute();
                    if (satisfied)
                        anyCompletedThisRun = true;
                }
            }
            if (anyCompletedThisRun) {
                await tx
                    .update(schema_2.employees)
                    .set({ employmentStatus: 'active' })
                    .where((0, drizzle_orm_1.eq)(schema_2.employees.id, employeeId))
                    .execute();
            }
            const pendingRow = await tx
                .select({ one: (0, drizzle_orm_1.sql) `1` })
                .from(schema_1.employeeChecklistStatus)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.inArray)(schema_1.employeeChecklistStatus.checklistId, checklistIds), (0, drizzle_orm_1.sql) `${schema_1.employeeChecklistStatus.status} <> 'completed'`))
                .limit(1)
                .execute();
            const hasRemaining = pendingRow.length > 0;
            if (!hasRemaining) {
                await tx
                    .update(schema_1.employeeOnboarding)
                    .set({ status: 'completed', completedAt: now })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.templateId, templateId)))
                    .execute();
            }
        });
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
    inferTagFromTitle(title) {
        const hit = this.TITLE_RULES.find((r) => r.test(title));
        return hit?.tag ?? null;
    }
    resolveChecklistFields(title, templateFields) {
        const exactKeys = this.exactTitleMap[this.norm(title)];
        if (exactKeys) {
            return exactKeys
                .map((k) => templateFields.find((f) => f.fieldKey === k))
                .filter(Boolean)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        const tag = this.inferTagFromTitle(title);
        if (tag) {
            if (tag === 'uploads') {
                const f = templateFields.find((f) => f.fieldKey === 'idUpload');
                return f ? [f] : [];
            }
            return templateFields
                .filter((f) => f.tag === tag)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        return [];
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