import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseInterceptors(AuditInterceptor)
@Controller('employee-finance')
export class FinanceController extends BaseController {
  constructor(private readonly financeService: FinanceService) {
    super();
  }

  @Post(':employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager', 'employee'])
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateFinanceDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.financeService.upsert(employeeId, dto, user.id, ip);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  findOne(@Param('id') id: string) {
    return this.financeService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'hr_manager'])
  @Audit({
    action: 'Delete',
    entity: 'EmployeeFinancials',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string) {
    return this.financeService.remove(id);
  }

  @Get('verify-account/:accountNumber/:bankCode')
  verifyAccount(
    @Param('accountNumber') accountNumber: string,
    @Param('bankCode') bankCode: string,
  ) {
    return this.financeService.verifyBankAccount(accountNumber, bankCode);
  }
}
