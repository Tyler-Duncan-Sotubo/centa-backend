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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const audit_service_1 = require("../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const expense_schema_1 = require("./schema/expense.schema");
const aws_service_1 = require("../../common/aws/aws.service");
const schema_1 = require("../../drizzle/schema");
const expense_approval_schema_1 = require("./schema/expense-approval.schema");
const expense_settings_service_1 = require("./settings/expense-settings.service");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_bulk_expense_dto_1 = require("./dto/create-bulk-expense.dto");
const export_util_1 = require("../../utils/export.util");
const s3_storage_service_1 = require("../../common/aws/s3-storage.service");
const pusher_service_1 = require("../notification/services/pusher.service");
const cache_service_1 = require("../../common/cache/cache.service");
const push_notification_service_1 = require("../notification/services/push-notification.service");
let ExpensesService = class ExpensesService {
    constructor(db, auditService, awsService, expenseSettingsService, awsStorage, pusher, cache, push) {
        this.db = db;
        this.auditService = auditService;
        this.awsService = awsService;
        this.expenseSettingsService = expenseSettingsService;
        this.awsStorage = awsStorage;
        this.pusher = pusher;
        this.cache = cache;
        this.push = push;
    }
    tags(companyId) {
        return [
            `company:${companyId}:expenses`,
            `company:${companyId}:expenses:list`,
            `company:${companyId}:expenses:reports`,
        ];
    }
    async exportAndUploadExcel(rows, columns, filenameBase, companyId, folder) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = await export_util_1.ExportUtil.exportToExcel(rows, columns, filenameBase);
        return this.awsStorage.uploadFilePath(filePath, companyId, 'report', folder);
    }
    async exportAndUpload(rows, columns, filenameBase, companyId, folder) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = await export_util_1.ExportUtil.exportToCSV(rows, columns, filenameBase);
        return this.awsStorage.uploadFilePath(filePath, companyId, 'report', folder);
    }
    async handleExpenseApprovalFlow(expenseId, user) {
        const expenseSettings = await this.expenseSettingsService.getExpenseSettings(user.companyId);
        const multi = expenseSettings.multiLevelApproval;
        const chain = expenseSettings.approverChain || [];
        let [workflow] = await this.db
            .select()
            .from(schema_1.approvalWorkflows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, expenseId)))
            .execute();
        if (!workflow) {
            [workflow] = await this.db
                .insert(schema_1.approvalWorkflows)
                .values({
                name: 'Expense Approval',
                companyId: user.companyId,
                entityId: expenseId,
                entityDate: new Date().toDateString(),
                createdAt: new Date(),
            })
                .returning()
                .execute();
        }
        const workflowId = workflow.id;
        const existingSteps = await this.db
            .select()
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId))
            .execute();
        if (existingSteps.length === 0) {
            const steps = multi
                ? chain.reverse().map((role, idx) => ({
                    workflowId,
                    sequence: idx + 1,
                    role,
                    minApprovals: 1,
                    maxApprovals: 1,
                    createdAt: new Date(),
                }))
                : [
                    {
                        workflowId,
                        sequence: 1,
                        role: 'finance_manager',
                        status: 'approved',
                        minApprovals: 1,
                        maxApprovals: 1,
                        createdAt: new Date(),
                    },
                ];
            const createdSteps = await this.db
                .insert(schema_1.approvalSteps)
                .values(steps)
                .returning({ id: schema_1.approvalSteps.id })
                .execute();
            await this.db
                .insert(expense_approval_schema_1.expenseApprovals)
                .values({
                expenseId,
                stepId: createdSteps[0].id,
                actorId: user.id,
                action: multi ? 'pending' : 'approved',
                remarks: multi ? 'Pending approval' : 'Auto-approved',
                createdAt: new Date(),
            })
                .execute();
        }
        if (!multi) {
            const [step] = await this.db
                .select()
                .from(schema_1.approvalSteps)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId), (0, drizzle_orm_1.eq)(schema_1.approvalSteps.sequence, 1)))
                .execute();
            const [expense] = await this.db
                .update(expense_schema_1.expenses)
                .set({ status: 'pending' })
                .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, expenseId))
                .returning()
                .execute();
            await this.pusher.createEmployeeNotification(user.companyId, expense.employeeId, `Your expense request has been auto-approved`, 'expense');
            await this.pusher.createNotification(user.companyId, `Your expense request has been auto-approved`, 'expense');
            if (step) {
                await this.db
                    .insert(expense_approval_schema_1.expenseApprovals)
                    .values({
                    expenseId,
                    stepId: step.id,
                    actorId: user.id,
                    action: 'approved',
                    remarks: 'Auto-approved',
                    createdAt: new Date(),
                })
                    .execute();
            }
            await this.cache.bumpCompanyVersion(user.companyId);
        }
    }
    async create(dto, user) {
        let receiptUrl = dto.receiptUrl;
        const [meta, base64Data] = dto.receiptUrl.split(',');
        const isPdf = meta?.includes('application/pdf');
        if (isPdf) {
            const pdfBuffer = Buffer.from(base64Data, 'base64');
            const fileName = `receipt-${Date.now()}.pdf`;
            receiptUrl = await this.awsService.uploadPdfToS3(dto.employeeId, fileName, pdfBuffer);
        }
        else {
            const fileName = `receipt-${Date.now()}.jpg`;
            receiptUrl = await this.awsService.uploadImageToS3(dto.employeeId, fileName, receiptUrl);
        }
        const [expense] = await this.db
            .insert(expense_schema_1.expenses)
            .values({
            companyId: user.companyId,
            employeeId: dto.employeeId,
            date: dto.date.toString(),
            category: dto.category,
            purpose: dto.purpose,
            amount: dto.amount,
            status: 'requested',
            submittedAt: new Date(),
            receiptUrl,
            paymentMethod: dto.paymentMethod,
        })
            .returning();
        await this.pusher.createNotification(user.companyId, `Expense request by ${user.firstName} ${user.lastName} for ${dto.purpose} has been created.`, 'expense');
        await this.handleExpenseApprovalFlow(expense.id, user);
        await this.auditService.logAction({
            action: 'create',
            entity: 'expense',
            entityId: expense.id,
            userId: user.id,
            details: 'Expense created',
            changes: {
                date: expense.date,
                category: expense.category,
                purpose: expense.purpose,
                amount: expense.amount,
                status: expense.status,
                submittedAt: expense.submittedAt,
                receiptUrl: expense.receiptUrl,
                paymentMethod: expense.paymentMethod,
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return expense;
    }
    async bulkCreateExpenses(companyId, rows, user) {
        const allEmployees = await this.db
            .select({
            id: schema_1.employees.id,
            fullName: (0, drizzle_orm_1.sql) `LOWER(${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName})`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId));
        const employeeMap = new Map(allEmployees.map((e) => [e.fullName.toLowerCase(), e.id]));
        const dtos = [];
        for (const row of rows) {
            const employeeName = row['Employee Name']?.trim().toLowerCase();
            if (!employeeName)
                continue;
            const employeeId = employeeMap.get(employeeName);
            if (!employeeId)
                continue;
            const dto = (0, class_transformer_1.plainToInstance)(create_bulk_expense_dto_1.CreateBulkExpenseDto, {
                date: row['Date'],
                category: row['Category'],
                purpose: row['Purpose'],
                amount: parseFloat(row['Amount']),
                status: 'Requested',
                paymentMethod: row['Payment Method'],
            });
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length)
                continue;
            dtos.push({ ...dto, employeeId });
        }
        const inserted = await this.db.transaction(async (trx) => {
            const insertedExpenses = [];
            for (const dto of dtos) {
                const [expense] = await trx
                    .insert(expense_schema_1.expenses)
                    .values({
                    companyId,
                    employeeId: dto.employeeId,
                    date: dto.date,
                    category: dto.category,
                    purpose: dto.purpose,
                    amount: dto.amount,
                    status: 'requested',
                    submittedAt: new Date(),
                    paymentMethod: dto.paymentMethod,
                })
                    .returning()
                    .execute();
                insertedExpenses.push(expense);
            }
            return insertedExpenses;
        });
        for (const expense of inserted) {
            await this.handleExpenseApprovalFlow(expense.id, user);
        }
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
    async update(id, dto, user) {
        const expense = await this.findOne(id);
        let receiptUrl = dto.receiptUrl;
        const [meta = '', base64Data = ''] = dto.receiptUrl
            ? dto.receiptUrl.split(',')
            : [];
        const isPdf = meta.includes('application/pdf');
        if (dto.receiptUrl) {
            if (isPdf) {
                const pdfBuffer = Buffer.from(base64Data, 'base64');
                const fileName = `receipt-${Date.now()}.pdf`;
                receiptUrl = await this.awsService.uploadPdfToS3(expense.employeeId, fileName, pdfBuffer);
            }
            else {
                const fileName = `receipt-${Date.now()}.jpg`;
                receiptUrl = await this.awsService.uploadImageToS3(expense.employeeId, fileName, receiptUrl);
            }
        }
        const [updated] = await this.db
            .update(expense_schema_1.expenses)
            .set({
            ...dto,
            receiptUrl: receiptUrl ?? expense.receiptUrl,
        })
            .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'expense',
            entityId: updated.id,
            userId: user.id,
            details: 'Expense updated',
            changes: {
                date: updated.date,
                category: updated.category,
                purpose: updated.purpose,
                amount: updated.amount,
                status: updated.status,
                submittedAt: updated.submittedAt,
                receiptUrl: updated.receiptUrl,
                paymentMethod: updated.paymentMethod,
            },
        });
        await this.cache.bumpCompanyVersion(updated.companyId);
        return updated;
    }
    async checkApprovalStatus(expenseId, user) {
        const [expense] = await this.db
            .select({
            id: expense_schema_1.expenses.id,
            expenseDate: expense_schema_1.expenses.date,
            approvalStatus: expense_schema_1.expenses.status,
            workflowId: schema_1.approvalWorkflows.id,
            companyId: expense_schema_1.expenses.companyId,
        })
            .from(expense_schema_1.expenses)
            .leftJoin(schema_1.approvalWorkflows, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, expense_schema_1.expenses.id), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, expense_schema_1.expenses.companyId)))
            .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, expenseId))
            .execute();
        if (!expense) {
            throw new common_1.NotFoundException(`Expense with ID ${expenseId} not found`);
        }
        if (!expense.workflowId) {
            throw new common_1.BadRequestException(`Approval workflow not initialized.`);
        }
        const steps = await this.db
            .select({
            id: schema_1.approvalSteps.id,
            sequence: schema_1.approvalSteps.sequence,
            role: schema_1.approvalSteps.role,
            minApprovals: schema_1.approvalSteps.minApprovals,
            maxApprovals: schema_1.approvalSteps.maxApprovals,
            createdAt: schema_1.approvalSteps.createdAt,
            status: schema_1.approvalSteps.status,
        })
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, expense.workflowId))
            .orderBy(schema_1.approvalSteps.sequence)
            .execute();
        const expenseSettings = await this.expenseSettingsService.getExpenseSettings(expense.companyId);
        const fallbackRoles = expenseSettings.fallbackRoles || [];
        const enrichedSteps = steps.map((step) => {
            const isFallback = fallbackRoles.includes(user?.role || '');
            const isPrimary = user?.role === step.role;
            return {
                ...step,
                fallbackRoles,
                isUserEligible: isPrimary || isFallback,
                isFallback: !isPrimary && isFallback,
            };
        });
        return {
            expenseDate: expense.expenseDate,
            approvalStatus: expense.approvalStatus,
            steps: enrichedSteps,
        };
    }
    async handleExpenseApprovalAction(expenseId, user, action, remarks) {
        const [expense] = await this.db
            .select({
            id: expense_schema_1.expenses.id,
            workflowId: schema_1.approvalWorkflows.id,
            approvalStatus: expense_schema_1.expenses.status,
            employeeId: expense_schema_1.expenses.employeeId,
            companyId: expense_schema_1.expenses.companyId,
        })
            .from(expense_schema_1.expenses)
            .leftJoin(schema_1.approvalWorkflows, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, expense_schema_1.expenses.id), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, user.companyId)))
            .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, expenseId))
            .limit(1)
            .execute();
        if (!expense)
            throw new common_1.NotFoundException(`Expense not found`);
        if (expense.approvalStatus === 'approved' ||
            expense.approvalStatus === 'rejected') {
            throw new common_1.BadRequestException(`This expense has already been ${expense.approvalStatus}.`);
        }
        if (!expense.workflowId) {
            throw new common_1.BadRequestException(`Approval workflow not initialized for this expense.`);
        }
        const steps = await this.db
            .select({
            id: schema_1.approvalSteps.id,
            sequence: schema_1.approvalSteps.sequence,
            role: schema_1.approvalSteps.role,
            status: schema_1.approvalSteps.status,
        })
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, expense.workflowId))
            .orderBy(schema_1.approvalSteps.sequence)
            .execute();
        const currentStep = steps.find((s) => s.status === 'pending');
        if (!currentStep)
            throw new common_1.BadRequestException(`No pending steps left to act on.`);
        const settings = await this.expenseSettingsService.getExpenseSettings(user.companyId);
        const fallbackRoles = settings.fallbackRoles || [];
        const actorRole = currentStep.role;
        const isFallback = fallbackRoles.includes(user.role);
        const isActor = user.role === actorRole;
        if (!isActor && !isFallback) {
            throw new common_1.BadRequestException(`You do not have permission to take action on this step. Required: ${actorRole}`);
        }
        if (action === 'rejected') {
            await this.db
                .update(schema_1.approvalSteps)
                .set({ status: 'rejected' })
                .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, currentStep.id))
                .execute();
            await this.db.insert(expense_approval_schema_1.expenseApprovals).values({
                expenseId,
                actorId: user.id,
                action,
                remarks: remarks ?? '',
                stepId: currentStep.id,
                createdAt: new Date(),
            });
            await this.db
                .update(expense_schema_1.expenses)
                .set({
                status: 'rejected',
                rejectionReason: remarks ?? '',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, expenseId))
                .execute();
            await this.pusher.createEmployeeNotification(user.companyId, expense.employeeId, `Your expense request has been ${action}`, 'expense');
            await this.pusher.createNotification(user.companyId, `Your expense request has been ${action}`, 'expense');
            await this.push.createAndSendToEmployee(expense.employeeId, {
                title: 'Expense Request Update',
                body: `Your expense request has been ${action}`,
                route: '/screens/dashboard/reimbursement/reimbursement-details',
                data: {
                    id: expenseId,
                },
                type: 'message',
            });
            await this.cache.bumpCompanyVersion(expense.companyId);
            return `Expense rejected successfully`;
        }
        if (isFallback) {
            const remainingSteps = steps.filter((s) => s.status === 'pending');
            for (const step of remainingSteps) {
                await this.db
                    .update(schema_1.approvalSteps)
                    .set({ status: 'approved' })
                    .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, step.id))
                    .execute();
                await this.db.insert(expense_approval_schema_1.expenseApprovals).values({
                    expenseId,
                    actorId: user.id,
                    action: 'approved',
                    remarks: `[Fallback] ${remarks ?? ''}`,
                    stepId: step.id,
                    createdAt: new Date(),
                });
            }
            await this.db
                .update(expense_schema_1.expenses)
                .set({ status: 'pending', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, expenseId))
                .execute();
            await this.pusher.createEmployeeNotification(user.companyId, expense.employeeId, `Your expense request has been ${action}`, 'expense');
            await this.pusher.createNotification(user.companyId, `Your expense request has been ${action}`, 'expense');
            await this.push.createAndSendToEmployee(expense.employeeId, {
                title: 'Expense Request Update',
                body: `Your expense request has been ${action}`,
                route: '/screens/dashboard/reimbursement/reimbursement-details',
                data: {
                    id: expenseId,
                },
                type: 'message',
            });
            await this.cache.bumpCompanyVersion(expense.companyId);
            return `Expense fully approved via fallback`;
        }
        await this.db
            .update(schema_1.approvalSteps)
            .set({ status: 'approved' })
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, currentStep.id))
            .execute();
        await this.db.insert(expense_approval_schema_1.expenseApprovals).values({
            expenseId,
            actorId: user.id,
            action,
            remarks: remarks ?? '',
            stepId: currentStep.id,
            createdAt: new Date(),
        });
        const allApproved = steps.every((s) => s.id === currentStep.id || s.status === 'approved');
        if (allApproved) {
            await this.db
                .update(expense_schema_1.expenses)
                .set({ status: 'pending', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, expenseId))
                .execute();
        }
        await this.pusher.createEmployeeNotification(user.companyId, expense.employeeId, `Your expense request has been ${action}`, 'expense');
        await this.pusher.createNotification(user.companyId, `Your expense request has been ${action}`, 'expense');
        await this.push.createAndSendToEmployee(expense.employeeId, {
            title: 'Expense Request Update',
            body: `Your expense request has been ${action}`,
            route: '/screens/dashboard/reimbursement/reimbursement-details',
            data: {
                id: expenseId,
            },
            type: 'message',
        });
        await this.cache.bumpCompanyVersion(expense.companyId);
        return `Expense ${action} successfully`;
    }
    async remove(id, user) {
        const exp = await this.findOne(id);
        const [updated] = await this.db
            .update(expense_schema_1.expenses)
            .set({ deletedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'expense',
            entityId: updated.id,
            userId: user.id,
            details: 'Expense soft-deleted',
            changes: { deletedAt: updated.deletedAt },
        });
        await this.cache.bumpCompanyVersion(exp.companyId);
        return { success: true, id: updated.id };
    }
    findAll(companyId) {
        const latestApprovals = this.db.$with('latest_approvals').as(this.db
            .select({
            expenseId: expense_approval_schema_1.expenseApprovals.expenseId,
            actorId: expense_approval_schema_1.expenseApprovals.actorId,
            createdAt: expense_approval_schema_1.expenseApprovals.createdAt,
            rowNumber: (0, drizzle_orm_1.sql) `ROW_NUMBER() OVER (PARTITION BY ${expense_approval_schema_1.expenseApprovals.expenseId} ORDER BY ${expense_approval_schema_1.expenseApprovals.createdAt} DESC)`.as('row_number'),
        })
            .from(expense_approval_schema_1.expenseApprovals)
            .where((0, drizzle_orm_1.eq)(expense_approval_schema_1.expenseApprovals.action, 'approved')));
        return this.cache.getOrSetVersioned(companyId, ['expenses', 'list'], async () => {
            return this.db
                .with(latestApprovals)
                .select({
                id: expense_schema_1.expenses.id,
                date: expense_schema_1.expenses.date,
                submittedAt: expense_schema_1.expenses.submittedAt,
                category: expense_schema_1.expenses.category,
                purpose: expense_schema_1.expenses.purpose,
                amount: expense_schema_1.expenses.amount,
                status: expense_schema_1.expenses.status,
                paymentMethod: expense_schema_1.expenses.paymentMethod,
                receiptUrl: expense_schema_1.expenses.receiptUrl,
                requester: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                employeeId: expense_schema_1.expenses.employeeId,
                approvedBy: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(expense_schema_1.expenses)
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(expense_schema_1.expenses.employeeId, schema_1.employees.id))
                .leftJoin(latestApprovals, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, latestApprovals.expenseId), (0, drizzle_orm_1.eq)(latestApprovals.rowNumber, 1)))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(latestApprovals.actorId, schema_1.users.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expense_schema_1.expenses.companyId, companyId), (0, drizzle_orm_1.isNull)(expense_schema_1.expenses.deletedAt)))
                .orderBy((0, drizzle_orm_1.desc)(expense_schema_1.expenses.createdAt));
        }, { tags: this.tags(companyId) });
    }
    async findAllByEmployeeId(employeeId) {
        const expensesList = await this.db
            .select()
            .from(expense_schema_1.expenses)
            .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.employeeId, employeeId))
            .orderBy((0, drizzle_orm_1.desc)(expense_schema_1.expenses.createdAt));
        return expensesList;
    }
    async findOne(id) {
        const [expense] = await this.db
            .select()
            .from(expense_schema_1.expenses)
            .where((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, id));
        if (!expense)
            throw new common_1.BadRequestException(`Expense with ID ${id} not found`);
        return expense;
    }
    async generateReimbursementReport(companyId, filters) {
        const keyParts = [
            'expenses',
            'reports',
            'reimbursement',
            `from:${filters?.fromDate ?? ''}`,
            `to:${filters?.toDate ?? ''}`,
            `emp:${filters?.employeeId ?? ''}`,
            `status:${filters?.status ?? 'all'}`,
        ];
        const latestApprovals = this.db.$with('latest_approvals').as(this.db
            .select({
            expenseId: expense_approval_schema_1.expenseApprovals.expenseId,
            actorId: expense_approval_schema_1.expenseApprovals.actorId,
            createdAt: expense_approval_schema_1.expenseApprovals.createdAt,
            rowNumber: (0, drizzle_orm_1.sql) `ROW_NUMBER() OVER (PARTITION BY ${expense_approval_schema_1.expenseApprovals.expenseId} ORDER BY ${expense_approval_schema_1.expenseApprovals.createdAt} DESC)`.as('row_number'),
        })
            .from(expense_approval_schema_1.expenseApprovals)
            .where((0, drizzle_orm_1.eq)(expense_approval_schema_1.expenseApprovals.action, 'approved')));
        return this.cache.getOrSetVersioned(companyId, keyParts, async () => {
            let whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expense_schema_1.expenses.companyId, companyId), (0, drizzle_orm_1.isNull)(expense_schema_1.expenses.deletedAt));
            if (filters?.fromDate)
                whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.sql) `${expense_schema_1.expenses.date} >= ${filters.fromDate}`);
            if (filters?.toDate)
                whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.sql) `${expense_schema_1.expenses.date} <= ${filters.toDate}`);
            if (filters?.employeeId)
                whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(expense_schema_1.expenses.employeeId, filters.employeeId));
            if (filters?.status && filters.status !== 'all') {
                whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(expense_schema_1.expenses.status, filters.status));
            }
            return this.db
                .with(latestApprovals)
                .select({
                id: expense_schema_1.expenses.id,
                date: expense_schema_1.expenses.date,
                submittedAt: expense_schema_1.expenses.submittedAt,
                category: expense_schema_1.expenses.category,
                purpose: expense_schema_1.expenses.purpose,
                amount: expense_schema_1.expenses.amount,
                status: expense_schema_1.expenses.status,
                paymentMethod: expense_schema_1.expenses.paymentMethod,
                receiptUrl: expense_schema_1.expenses.receiptUrl,
                requester: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                employeeId: expense_schema_1.expenses.employeeId,
                approvedBy: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
                approvalDate: latestApprovals.createdAt,
            })
                .from(expense_schema_1.expenses)
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(expense_schema_1.expenses.employeeId, schema_1.employees.id))
                .leftJoin(latestApprovals, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expense_schema_1.expenses.id, latestApprovals.expenseId), (0, drizzle_orm_1.eq)(latestApprovals.rowNumber, 1)))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(latestApprovals.actorId, schema_1.users.id))
                .where(whereClause)
                .orderBy((0, drizzle_orm_1.desc)(expense_schema_1.expenses.createdAt));
        }, { tags: this.tags(companyId) });
    }
    async generateReimbursementReportToS3(companyId, format = 'csv', filters) {
        const allData = await this.generateReimbursementReport(companyId, filters);
        const rows = allData.map((r) => ({
            ExpenseID: r.id,
            Date: r.date,
            SubmittedAt: r.submittedAt,
            Category: r.category,
            Purpose: r.purpose,
            Amount: r.amount,
            Status: r.status,
            PaymentMethod: r.paymentMethod,
            Requester: r.requester,
            ApprovedBy: r.approvedBy,
            ApprovalDate: r.approvalDate,
        }));
        const columns = [
            { field: 'Date', title: 'Date' },
            { field: 'Requester', title: 'Requester' },
            { field: 'SubmittedAt', title: 'Submitted At' },
            { field: 'Category', title: 'Category' },
            { field: 'Purpose', title: 'Purpose' },
            { field: 'Amount', title: 'Amount (₦)' },
            { field: 'Status', title: 'Status' },
            { field: 'PaymentMethod', title: 'Payment Method' },
            { field: 'ApprovedBy', title: 'Approved By' },
            { field: 'ApprovalDate', title: 'Approval Date' },
        ];
        const filename = `reimbursement_report_${companyId}_${new Date().toISOString().split('T')[0]}`;
        if (format === 'excel') {
            return this.exportAndUploadExcel(rows, columns, filename, companyId, 'reimbursement');
        }
        else {
            return this.exportAndUpload(rows, columns, filename, companyId, 'reimbursement');
        }
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        aws_service_1.AwsService,
        expense_settings_service_1.ExpensesSettingsService,
        s3_storage_service_1.S3StorageService,
        pusher_service_1.PusherService,
        cache_service_1.CacheService,
        push_notification_service_1.PushNotificationService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map