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
  Ip,
  UseInterceptors,
} from '@nestjs/common';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
import { LeavePolicyService } from './leave-policy.service';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@Controller('leave-policy')
export class LeavePolicyController extends BaseController {
  constructor(private readonly leavePolicy: LeavePolicyService) {
    super();
  }

  // Leave Policy Endpoints
  @Post('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.policy.manage'])
  createLeavePolicy(
    @Body() dto: CreateLeavePolicyDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leavePolicy.create(dto, user, ip);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.policy.manage'])
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreateLeavePolicies(
    @Body() rows: any[],
    @CurrentUser() user: User,
  ) {
    return this.leavePolicy.bulkCreateLeavePolicies(user.companyId, rows);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.policy.read'])
  findAllLeavePolicies(@CurrentUser() user: User) {
    return this.leavePolicy.findAll(user.companyId);
  }

  @Get(':leaveTypeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.policy.read'])
  findOneLeavePolicy(
    @Param('leaveTypeId') leaveTypeId: string,
    @CurrentUser() user: User,
  ) {
    return this.leavePolicy.findOne(user.companyId, leaveTypeId);
  }

  @Patch(':leaveTypeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.policy.manage'])
  updateLeavePolicy(
    @Param('leaveTypeId') leaveTypeId: string,
    @Body() dto: UpdateLeavePolicyDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leavePolicy.update(leaveTypeId, dto, user, ip);
  }

  @Delete(':leaveTypeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.policy.manage'])
  removeLeavePolicy(
    @Param('leaveTypeId') leaveTypeId: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.leavePolicy.remove(leaveTypeId, user, ip);
  }
}
