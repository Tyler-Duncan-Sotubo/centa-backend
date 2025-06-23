import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  SetMetadata,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@Controller('expenses')
export class ExpensesController extends BaseController {
  constructor(private readonly expensesService: ExpensesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.manage'])
  create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: User,
  ) {
    return this.expensesService.create(createExpenseDto, user);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.bulk_upload'])
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.expensesService.bulkCreateExpenses(user.companyId, rows, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.read'])
  findAll(@CurrentUser() user: User) {
    return this.expensesService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.read'])
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.read'])
  findByEmployee(@Param('id') id: string) {
    return this.expensesService.findAllByEmployeeId(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.manage'])
  update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() user: User,
  ) {
    return this.expensesService.update(id, updateExpenseDto, user);
  }

  @Get(':id/approval-status')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.read'])
  getApprovalStatus(@Param('id') id: string) {
    return this.expensesService.checkApprovalStatus(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.manage'])
  approveExpense(
    @Param('id') id: string,
    @Body('action') action: 'approved' | 'rejected',
    @Body('remarks') remarks: string,
    @CurrentUser() user: User,
  ) {
    return this.expensesService.handleExpenseApprovalAction(
      id,
      user,
      action,
      remarks,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.expensesService.remove(id, user);
  }

  @Get('reimbursement-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.manage'])
  async getReimbursementReport(
    @CurrentUser() user: User,
    @Query() filters: any,
  ) {
    return this.expensesService.generateReimbursementReport(
      user.companyId,
      filters,
    );
  }

  @Get('reimbursement-report/export')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['expenses.manage'])
  async exportReimbursementReport(
    @CurrentUser() user: User,
    @Query() filters: any,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const url = await this.expensesService.generateReimbursementReportToS3(
      user.companyId,
      format,
      filters,
    );

    return { url };
  }
}
