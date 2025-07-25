import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { expenses } from './schema/expense.schema';
import { User } from 'src/common/types/user.type';
import { AwsService } from 'src/common/aws/aws.service';
import {
  approvalSteps,
  approvalWorkflows,
  employees,
  users,
} from 'src/drizzle/schema';
import { expenseApprovals } from './schema/expense-approval.schema';
import { ExpensesSettingsService } from './settings/expense-settings.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBulkExpenseDto } from './dto/create-bulk-expense.dto';
import { ExportUtil } from 'src/utils/export.util';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private awsService: AwsService,
    private readonly expenseSettingsService: ExpensesSettingsService,
    private readonly awsStorage: S3StorageService,
    private readonly pusher: PusherService,
  ) {}

  private async exportAndUploadExcel<T>(
    rows: T[],
    columns: { field: string; title: string }[],
    filenameBase: string,
    companyId: string,
    folder: string,
  ) {
    if (!rows.length) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    const filePath = await ExportUtil.exportToExcel(
      rows,
      columns,
      filenameBase,
    );

    return this.awsStorage.uploadFilePath(
      filePath,
      companyId,
      'report',
      folder,
    );
  }

  private async exportAndUpload<T>(
    rows: T[],
    columns: { field: string; title: string }[],
    filenameBase: string,
    companyId: string,
    folder: string,
  ) {
    if (!rows.length) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    const filePath = await ExportUtil.exportToCSV(rows, columns, filenameBase);

    return this.awsStorage.uploadFilePath(
      filePath,
      companyId,
      'report',
      folder,
    );
  }

  async handleExpenseApprovalFlow(expenseId: string, user: User) {
    // 1. Load expense settings
    const expenseSettings =
      await this.expenseSettingsService.getExpenseSettings(user.companyId);
    const multi = expenseSettings.multiLevelApproval;
    const chain = expenseSettings.approverChain || [];

    // 2. Reuse or create approvalWorkflow for this expense
    let [workflow] = await this.db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.companyId, user.companyId),
          eq(approvalWorkflows.entityId, expenseId),
        ),
      )
      .execute();

    if (!workflow) {
      [workflow] = await this.db
        .insert(approvalWorkflows)
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

    // 3. Create approval steps if not exist
    const existingSteps = await this.db
      .select()
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, workflowId))
      .execute();

    if (existingSteps.length === 0) {
      const steps = multi
        ? chain.reverse().map((role: any, idx: number) => ({
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
              role: 'finance_manager', // default role
              status: 'approved',
              minApprovals: 1,
              maxApprovals: 1,
              createdAt: new Date(),
            },
          ];

      const createdSteps = await this.db
        .insert(approvalSteps)
        .values(steps)
        .returning({
          id: approvalSteps.id,
        })
        .execute();

      // 4. Create initial approval record
      await this.db
        .insert(expenseApprovals)
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

    // 5. Auto-approve if not multi-level
    if (!multi) {
      const [step] = await this.db
        .select()
        .from(approvalSteps)
        .where(
          and(
            eq(approvalSteps.workflowId, workflowId),
            eq(approvalSteps.sequence, 1),
          ),
        )
        .execute();

      // update the expense status to 'Approved'
      const [expense] = await this.db
        .update(expenses)
        .set({
          status: 'pending',
        })
        .where(eq(expenses.id, expenseId))
        .returning()
        .execute();

      await this.pusher.createEmployeeNotification(
        user.companyId,
        expense.employeeId,
        `Your expense request has been auto-approved`,
        'expense',
      );

      await this.pusher.createNotification(
        user.companyId,
        `Your expense request has been auto-approved`,
        'expense',
      );

      if (step) {
        await this.db
          .insert(expenseApprovals)
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
    }
  }

  async create(dto: CreateExpenseDto, user: User) {
    let receiptUrl = dto.receiptUrl;
    const [meta, base64Data] = dto.receiptUrl.split(',');
    const isPdf = meta.includes('application/pdf');

    if (isPdf) {
      // Convert raw Base64 → Buffer (PDF helper expects Buffer)
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const fileName = `receipt-${Date.now()}.pdf`;
      receiptUrl = await this.awsService.uploadPdfToS3(
        dto.employeeId,
        fileName,
        pdfBuffer,
      );
    } else {
      const fileName = `receipt-${Date.now()}.jpg`; // or `.png` depending on contentType logic
      receiptUrl = await this.awsService.uploadImageToS3(
        dto.employeeId,
        fileName,
        receiptUrl,
      );
    }

    const [expense] = await this.db
      .insert(expenses)
      .values({
        companyId: user.companyId,
        employeeId: dto.employeeId,
        date: dto.date.toString(),
        category: dto.category,
        purpose: dto.purpose,
        amount: dto.amount,
        status: 'requested',
        submittedAt: new Date(),
        receiptUrl, // Updated here
        paymentMethod: dto.paymentMethod,
      })
      .returning();

    await this.pusher.createNotification(
      user.companyId,
      `Expense request by ${user.firstName} ${user.lastName} for ${dto.purpose} has been created.`,
      'expense',
    );

    // Handle approval flow
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

    return expense;
  }

  async bulkCreateExpenses(companyId: string, rows: any[], user: User) {
    type Row = {
      'Employee Name': string;
      Date: string;
      Category: string;
      Purpose: string;
      Amount: string | number;
      'Payment Method': string;
    };

    // Preload all employees for the company
    const allEmployees = await this.db
      .select({
        id: employees.id,
        fullName: sql<string>`LOWER(${employees.firstName} || ' ' || ${employees.lastName})`,
      })
      .from(employees)
      .where(eq(employees.companyId, companyId));

    const employeeMap = new Map(
      allEmployees.map((e) => [e.fullName.toLowerCase(), e.id]),
    );

    const dtos: (CreateBulkExpenseDto & { employeeId: string })[] = [];

    for (const row of rows as Row[]) {
      const employeeName = row['Employee Name']?.trim().toLowerCase();
      if (!employeeName) {
        console.warn(`Skipping row with missing employee name:`, row);
        continue;
      }

      const employeeId = employeeMap.get(employeeName);
      if (!employeeId) {
        console.warn(`Skipping row with unknown employee: ${employeeName}`);
        continue;
      }

      const dto = plainToInstance(CreateBulkExpenseDto, {
        date: row['Date'],
        category: row['Category'],
        purpose: row['Purpose'],
        amount: parseFloat(row['Amount'] as string),
        status: 'Requested',
        paymentMethod: row['Payment Method'],
      });

      const errors = await validate(dto);
      if (errors.length) {
        console.warn(`❌ Skipping invalid row for ${employeeName}:`, errors);
        continue;
      }

      dtos.push({ ...dto, employeeId });
    }

    const inserted = await this.db.transaction(async (trx) => {
      const insertedExpenses: (typeof expenses.$inferSelect)[] = [];

      for (const dto of dtos) {
        const [expense] = await trx
          .insert(expenses)
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

    return inserted;
  }

  findAll(companyId: string) {
    const latestApprovals = this.db.$with('latest_approvals').as(
      this.db
        .select({
          expenseId: expenseApprovals.expenseId,
          actorId: expenseApprovals.actorId,
          createdAt: expenseApprovals.createdAt,
          rowNumber:
            sql<number>`ROW_NUMBER() OVER (PARTITION BY ${expenseApprovals.expenseId} ORDER BY ${expenseApprovals.createdAt} DESC)`.as(
              'row_number',
            ),
        })
        .from(expenseApprovals)
        .where(eq(expenseApprovals.action, 'approved')),
    );

    return this.db
      .with(latestApprovals)
      .select({
        id: expenses.id,
        date: expenses.date,
        submittedAt: expenses.submittedAt,
        category: expenses.category,
        purpose: expenses.purpose,
        amount: expenses.amount,
        status: expenses.status,
        paymentMethod: expenses.paymentMethod,
        receiptUrl: expenses.receiptUrl,
        requester: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        employeeId: expenses.employeeId,
        approvedBy: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(expenses)
      .leftJoin(employees, eq(expenses.employeeId, employees.id))
      .leftJoin(
        latestApprovals,
        and(
          eq(expenses.id, latestApprovals.expenseId),
          eq(latestApprovals.rowNumber, 1),
        ),
      )
      .leftJoin(users, eq(latestApprovals.actorId, users.id))
      .where(and(eq(expenses.companyId, companyId), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.createdAt));
  }

  async findAllByEmployeeId(employeeId: string) {
    const expensesList = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.employeeId, employeeId))
      .orderBy(desc(expenses.createdAt));

    return expensesList;
  }

  async findOne(id: string) {
    const [expense] = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));

    if (!expense) {
      throw new BadRequestException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, user: User) {
    // Check if the expense exists
    const expense = await this.findOne(id);

    let receiptUrl = dto.receiptUrl;

    const splitResult = dto.receiptUrl ? dto.receiptUrl.split(',') : [];
    const [meta = '', base64Data = ''] = splitResult;
    const isPdf = meta.includes('application/pdf');

    if (isPdf) {
      // Convert raw Base64 → Buffer (PDF helper expects Buffer)
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const fileName = `receipt-${Date.now()}.pdf`;
      receiptUrl = await this.awsService.uploadPdfToS3(
        expense.employeeId,
        fileName,
        pdfBuffer,
      );
    } else {
      const fileName = `receipt-${Date.now()}.jpg`; // or `.png` depending on contentType logic
      receiptUrl = await this.awsService.uploadImageToS3(
        expense.employeeId,
        fileName,
        receiptUrl,
      );
    }

    const [updated] = await this.db
      .update(expenses)
      .set({
        ...dto,
        receiptUrl, // updated with uploaded S3 URL if needed
      })
      .where(eq(expenses.id, id))
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

    return updated;
  }

  async checkApprovalStatus(expenseId: string, user?: User) {
    // 1. Fetch expense and its workflow
    const [expense] = await this.db
      .select({
        id: expenses.id,
        expenseDate: expenses.date,
        approvalStatus: expenses.status,
        workflowId: approvalWorkflows.id,
        companyId: expenses.companyId,
      })
      .from(expenses)
      .leftJoin(
        approvalWorkflows,
        and(
          eq(approvalWorkflows.entityId, expenses.id),
          eq(approvalWorkflows.companyId, expenses.companyId),
        ),
      )
      .where(eq(expenses.id, expenseId))
      .execute();

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found`);
    }

    if (!expense.workflowId) {
      throw new BadRequestException(`Approval workflow not initialized.`);
    }

    // 2. Fetch approval steps
    const steps = await this.db
      .select({
        id: approvalSteps.id,
        sequence: approvalSteps.sequence,
        role: approvalSteps.role,
        minApprovals: approvalSteps.minApprovals,
        maxApprovals: approvalSteps.maxApprovals,
        createdAt: approvalSteps.createdAt,
        status: approvalSteps.status,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, expense.workflowId))
      .orderBy(approvalSteps.sequence)
      .execute();

    // 3. Load fallback roles from company settings
    const expenseSettings =
      await this.expenseSettingsService.getExpenseSettings(expense.companyId);
    const fallbackRoles = expenseSettings.fallbackRoles || [];

    // 4. Enrich steps with fallback eligibility
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

  async handleExpenseApprovalAction(
    expenseId: string,
    user: User,
    action: 'approved' | 'rejected',
    remarks?: string,
  ) {
    const [expense] = await this.db
      .select({
        id: expenses.id,
        workflowId: approvalWorkflows.id,
        approvalStatus: expenses.status,
        employeeId: expenses.employeeId,
      })
      .from(expenses)
      .leftJoin(
        approvalWorkflows,
        and(
          eq(approvalWorkflows.entityId, expenses.id),
          eq(approvalWorkflows.companyId, user.companyId),
        ),
      )
      .where(eq(expenses.id, expenseId))
      .limit(1)
      .execute();

    if (!expense) {
      throw new NotFoundException(`Expense not found`);
    }

    if (
      expense.approvalStatus === 'approved' ||
      expense.approvalStatus === 'rejected'
    ) {
      throw new BadRequestException(
        `This expense has already been ${expense.approvalStatus}.`,
      );
    }

    if (!expense.workflowId) {
      throw new BadRequestException(
        `Approval workflow not initialized for this expense.`,
      );
    }

    const steps = await this.db
      .select({
        id: approvalSteps.id,
        sequence: approvalSteps.sequence,
        role: approvalSteps.role,
        status: approvalSteps.status,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, expense.workflowId))
      .orderBy(approvalSteps.sequence)
      .execute();

    const currentStep = steps.find((s) => s.status === 'pending');
    if (!currentStep) {
      throw new BadRequestException(`No pending steps left to act on.`);
    }

    const settings = await this.expenseSettingsService.getExpenseSettings(
      user.companyId,
    );
    const fallbackRoles = settings.fallbackRoles || [];
    const actorRole = currentStep.role;
    const isFallback = fallbackRoles.includes(user.role);
    const isActor = user.role === actorRole;

    if (!isActor && !isFallback) {
      throw new BadRequestException(
        `You do not have permission to take action on this step. Required: ${actorRole}`,
      );
    }

    // 👇 If rejected, mark the current step & expense as rejected
    if (action === 'rejected') {
      await this.db
        .update(approvalSteps)
        .set({ status: 'rejected' })
        .where(eq(approvalSteps.id, currentStep.id))
        .execute();

      await this.db.insert(expenseApprovals).values({
        expenseId,
        actorId: user.id,
        action,
        remarks: remarks ?? '',
        stepId: currentStep.id,
        createdAt: new Date(),
      });

      await this.db
        .update(expenses)
        .set({
          status: 'rejected',
          rejectionReason: remarks ?? '',
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, expenseId))
        .execute();

      await this.pusher.createEmployeeNotification(
        user.companyId,
        expense.employeeId,
        `Your expense request has been ${action}`,
        'expense',
      );

      await this.pusher.createNotification(
        user.companyId,
        `Your expense request has been ${action}`,
        'expense',
      );

      return `Expense rejected successfully`;
    }

    // ✅ Handle fallback bulk approval
    if (isFallback) {
      const remainingSteps = steps.filter((s) => s.status === 'pending');

      for (const step of remainingSteps) {
        await this.db
          .update(approvalSteps)
          .set({ status: 'approved' })
          .where(eq(approvalSteps.id, step.id))
          .execute();

        await this.db.insert(expenseApprovals).values({
          expenseId,
          actorId: user.id,
          action: 'approved',
          remarks: `[Fallback] ${remarks ?? ''}`,
          stepId: step.id,
          createdAt: new Date(),
        });
      }

      await this.db
        .update(expenses)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, expenseId))
        .execute();

      await this.pusher.createEmployeeNotification(
        user.companyId,
        expense.employeeId,
        `Your expense request has been ${action}`,
        'expense',
      );

      await this.pusher.createNotification(
        user.companyId,
        `Your expense request has been ${action}`,
        'expense',
      );

      return `Expense fully approved via fallback`;
    }

    // ✅ Regular actor: Approve only current step
    await this.db
      .update(approvalSteps)
      .set({ status: 'approved' })
      .where(eq(approvalSteps.id, currentStep.id))
      .execute();

    await this.db.insert(expenseApprovals).values({
      expenseId,
      actorId: user.id,
      action,
      remarks: remarks ?? '',
      stepId: currentStep.id,
      createdAt: new Date(),
    });

    const allApproved = steps.every(
      (s) => s.id === currentStep.id || s.status === 'approved',
    );

    if (allApproved) {
      await this.db
        .update(expenses)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, expenseId))
        .execute();
    }

    // notify the user about the action taken
    await this.pusher.createEmployeeNotification(
      user.companyId,
      expense.employeeId,
      `Your expense request has been ${action}`,
      'expense',
    );

    await this.pusher.createNotification(
      user.companyId,
      `Your expense request has been ${action}`,
      'expense',
    );

    return `Expense ${action} successfully`;
  }

  async remove(id: string, user: User) {
    // Ensure the expense exists (optional but recommended)
    await this.findOne(id);

    // Soft delete by setting deletedAt
    const [updated] = await this.db
      .update(expenses)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();

    // Audit log for deletion
    await this.auditService.logAction({
      action: 'delete',
      entity: 'expense',
      entityId: updated.id,
      userId: user.id,
      details: 'Expense soft-deleted',
      changes: {
        deletedAt: updated.deletedAt,
      },
    });

    return { success: true, id: updated.id };
  }

  async generateReimbursementReport(
    companyId: string,
    filters?: {
      fromDate?: string;
      toDate?: string;
      employeeId?: string;
      status?:
        | 'requested'
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'all'
        | 'paid';
    },
  ) {
    const latestApprovals = this.db.$with('latest_approvals').as(
      this.db
        .select({
          expenseId: expenseApprovals.expenseId,
          actorId: expenseApprovals.actorId,
          createdAt: expenseApprovals.createdAt,
          rowNumber:
            sql<number>`ROW_NUMBER() OVER (PARTITION BY ${expenseApprovals.expenseId} ORDER BY ${expenseApprovals.createdAt} DESC)`.as(
              'row_number',
            ),
        })
        .from(expenseApprovals)
        .where(eq(expenseApprovals.action, 'approved')),
    );

    let whereClause = and(
      eq(expenses.companyId, companyId),
      isNull(expenses.deletedAt),
    );

    if (filters?.fromDate) {
      whereClause = and(
        whereClause,
        sql`${expenses.date} >= ${filters.fromDate}`,
      );
    }
    if (filters?.toDate) {
      whereClause = and(
        whereClause,
        sql`${expenses.date} <= ${filters.toDate}`,
      );
    }
    if (filters?.employeeId) {
      whereClause = and(
        whereClause,
        eq(expenses.employeeId, filters.employeeId),
      );
    }
    if (filters?.status && filters.status !== 'all') {
      whereClause = and(whereClause, eq(expenses.status, filters.status));
    }

    const report = await this.db
      .with(latestApprovals)
      .select({
        id: expenses.id,
        date: expenses.date,
        submittedAt: expenses.submittedAt,
        category: expenses.category,
        purpose: expenses.purpose,
        amount: expenses.amount,
        status: expenses.status,
        paymentMethod: expenses.paymentMethod,
        receiptUrl: expenses.receiptUrl,
        requester: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        employeeId: expenses.employeeId,
        approvedBy: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        approvalDate: latestApprovals.createdAt,
      })
      .from(expenses)
      .leftJoin(employees, eq(expenses.employeeId, employees.id))
      .leftJoin(
        latestApprovals,
        and(
          eq(expenses.id, latestApprovals.expenseId),
          eq(latestApprovals.rowNumber, 1),
        ),
      )
      .leftJoin(users, eq(latestApprovals.actorId, users.id))
      .where(whereClause)
      .orderBy(desc(expenses.createdAt));

    return report;
  }

  async generateReimbursementReportToS3(
    companyId: string,
    format: 'excel' | 'csv' = 'csv',
    filters?: {
      fromDate?: string;
      toDate?: string;
      employeeId?: string;
      status?:
        | 'requested'
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'paid'
        | 'all';
    },
  ) {
    // 1. Fetch reimbursement report using existing service
    const allData = await this.generateReimbursementReport(companyId, filters);

    // 2. Prepare rows for export
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

    // 3. Define export columns
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

    // 4. File name convention (include current date)
    const filename = `reimbursement_report_${companyId}_${new Date().toISOString().split('T')[0]}`;

    // 5. Export and upload to S3
    if (format === 'excel') {
      return this.exportAndUploadExcel(
        rows,
        columns,
        filename,
        companyId,
        'reimbursement',
      );
    } else if (format === 'csv') {
      return this.exportAndUpload(
        rows,
        columns,
        filename,
        companyId,
        'reimbursement',
      );
    }
  }
}
