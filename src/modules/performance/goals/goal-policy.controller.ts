// src/modules/performance/policy/policy.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { PolicyService } from './goal-policy.service';
import { UpsertCompanyPolicyDto, UpsertTeamPolicyDto } from './dto/policy.dtos';
import { BaseController } from 'src/common/interceptor/base.controller';

@UseGuards(JwtAuthGuard)
@Controller('performance-policies')
export class PerformancePolicyController extends BaseController {
  constructor(private readonly policy: PolicyService) {
    super();
  }

  // Get effective policy for UI prefill (system -> company -> team)
  @Get('')
  @SetMetadata('permissions', ['performance.goals.edit'])
  getEffective(@CurrentUser() user: User, @Query('groupId') groupId?: string) {
    return this.policy.getEffectivePolicy(user.companyId, groupId ?? null);
  }

  // Upsert company-wide defaults (admin)
  @Patch('company')
  @SetMetadata('permissions', ['performance.goals.edit'])
  upsertCompany(
    @CurrentUser() user: User,
    @Body() dto: UpsertCompanyPolicyDto,
  ) {
    return this.policy.upsertCompanyPolicy(user.companyId, user.id, dto);
  }

  // Upsert team override (admin)
  @Patch('team/:groupId')
  @SetMetadata('permissions', ['performance.goals.edit'])
  upsertTeam(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
    @Body() dto: UpsertTeamPolicyDto,
  ) {
    return this.policy.upsertTeamPolicy(user.companyId, groupId, user.id, dto);
  }

  // Resync an objective's schedule from policy (optional endpoint)
  @Post('/objectives/:objectiveId/schedule/resync')
  @SetMetadata('permissions', ['performance.goals.edit'])
  resyncObjectiveSchedule(
    @Param('objectiveId') objectiveId: string,
    @CurrentUser() user: User,
    @Body()
    overrides?: Partial<{
      cadence: 'weekly' | 'biweekly' | 'monthly';
      timezone: string;
      anchorDow: number;
      anchorHour: number;
      groupId: string | null;
    }>,
  ) {
    const groupId = overrides?.groupId ?? null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cadence, timezone, anchorDow, anchorHour, ..._ } = overrides ?? {};
    return this.policy.upsertObjectiveScheduleFromPolicy(
      objectiveId,
      user.companyId,
      groupId,
      {
        cadence,
        timezone,
        anchorDow,
        anchorHour,
      },
    );
  }
}
