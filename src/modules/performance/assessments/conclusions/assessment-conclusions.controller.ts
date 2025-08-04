import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { CreateConclusionDto } from './dto/create-conclusion.dto';
import { UpdateConclusionDto } from './dto/update-conclusion.dto';
import { AssessmentConclusionsService } from './conclusions.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('assessments/:assessmentId/conclusion')
@UseGuards(JwtAuthGuard)
export class AssessmentConclusionsController extends BaseController {
  constructor(
    private readonly conclusionsService: AssessmentConclusionsService,
  ) {
    super();
  }

  // Create a conclusion — only for manager assessments
  @Post()
  @SetMetadata('permissions', [
    'performance.reviews.submit_manager',
    'performance.reviews.manage_all',
  ])
  create(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: CreateConclusionDto,
    @CurrentUser() user: User,
  ) {
    return this.conclusionsService.createConclusion(assessmentId, dto, user.id);
  }

  // Update an existing conclusion
  @Patch()
  @SetMetadata('permissions', [
    'performance.reviews.submit_manager',
    'performance.reviews.manage_all',
  ])
  update(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: UpdateConclusionDto,
    @CurrentUser() user: User,
  ) {
    return this.conclusionsService.updateConclusion(assessmentId, dto, user.id);
  }

  // Get the conclusion for an assessment
  @Get()
  @SetMetadata('permissions', [
    'performance.reviews.read',
    'performance.reviews.read_team',
    'performance.reviews.manage_all',
  ])
  get(@Param('assessmentId') assessmentId: string) {
    return this.conclusionsService.getConclusionByAssessment(assessmentId);
  }
}
