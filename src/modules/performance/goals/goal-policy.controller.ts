// src/modules/performance/policy/policy.controller.ts
import {
  Controller,
  Get,
  Body,
  UseGuards,
  SetMetadata,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { PolicyService } from './goal-policy.service';
import { UpsertCompanyPolicyDto } from './dto/policy.dtos';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseGuards(JwtAuthGuard)
@Controller('performance-policies')
export class PerformancePolicyController extends BaseController {
  constructor(private readonly policy: PolicyService) {
    super();
  }

  // Effective (company -> system)
  @Get('')
  @SetMetadata('permissions', ['performance.goals.edit'])
  getEffective(@CurrentUser() user: User) {
    return this.policy.getEffectivePolicy(user.companyId);
  }

  // Upsert company policy
  @Patch('company')
  @SetMetadata('permissions', ['performance.goals.edit'])
  upsertCompany(
    @CurrentUser() user: User,
    @Body() dto: UpsertCompanyPolicyDto,
  ) {
    return this.policy.upsertCompanyPolicy(user.companyId, user.id, dto);
  }
}
