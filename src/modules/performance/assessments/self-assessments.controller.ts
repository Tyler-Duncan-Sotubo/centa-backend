import {
  Controller,
  Get,
  Param,
  Body,
  UseGuards,
  SetMetadata,
  Patch,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { SelfAssessmentsService } from './self-assessments.service';

@Controller('performance-assessments/self')
@UseGuards(JwtAuthGuard)
export class SelfAssessmentsController extends BaseController {
  constructor(private readonly selfAssessmentsService: SelfAssessmentsService) {
    super();
  }

  /**
   * ✅ ESS: Get or create self assessment for cycle + return:
   * - assessment
   * - questions (template.includeQuestionnaire)
   * - goals (template.includeGoals)
   * - selfSummary
   */
  @Get(':cycleId')
  @SetMetadata('permissions', ['performance.reviews.submit_self'])
  getOrCreateForCycle(
    @Param('cycleId') cycleId: string,
    @CurrentUser() user: User,
  ) {
    return this.selfAssessmentsService.getSelfAssessmentPayload(user, cycleId);
  }

  /** ✅ Start self assessment (owner only) */
  @Patch(':id/start')
  @SetMetadata('permissions', ['performance.reviews.submit_self'])
  start(@Param('id') id: string, @CurrentUser() user: User) {
    return this.selfAssessmentsService.startSelfAssessment(user, id);
  }

  /** ✅ Submit self assessment (owner only) */
  @Post(':id/submit')
  @SetMetadata('permissions', ['performance.reviews.submit_self'])
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.selfAssessmentsService.submitSelfAssessment(user, id);
  }

  /** ✅ Upsert self summary (owner only; locked when submitted) */
  @Post(':id/summary')
  @SetMetadata('permissions', ['performance.reviews.submit_self'])
  upsertSummary(
    @Param('id') id: string,
    @Body() body: { summary: string },
    @CurrentUser() user: User,
  ) {
    return this.selfAssessmentsService.upsertSelfSummary(
      user,
      id,
      body?.summary ?? '',
    );
  }
}
