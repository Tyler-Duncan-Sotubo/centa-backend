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

  // ---------------------
  // Core CRUD
  // ---------------------

  // Create a conclusion — line manager / HR
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

  // Update a conclusion
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

  // Get conclusion
  @Get()
  @SetMetadata('permissions', [
    'performance.reviews.read',
    'performance.reviews.read_team',
    'performance.reviews.manage_all',
  ])
  get(@Param('assessmentId') assessmentId: string) {
    return this.conclusionsService.getConclusionByAssessment(assessmentId);
  }

  // ---------------------
  // Workflow actions
  // ---------------------

  // Line Manager → submit conclusion to HR
  @Post('submit-to-hr')
  @SetMetadata('permissions', [
    'performance.reviews.submit_manager',
    'performance.reviews.manage_all',
  ])
  submitToHr(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.conclusionsService.submitConclusionToHR(assessmentId, user.id);
  }

  // HR → request changes from Line Manager
  @Post('request-changes')
  @SetMetadata('permissions', ['performance.reviews.manage_all'])
  requestChanges(
    @Param('assessmentId') assessmentId: string,
    @Body('note') note: string,
    @CurrentUser() user: User,
  ) {
    return this.conclusionsService.requestChanges(assessmentId, note, user.id);
  }

  // HR → approve / finalize conclusion
  @Post('approve')
  @SetMetadata('permissions', ['performance.reviews.manage_all'])
  approve(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.conclusionsService.approveConclusion(assessmentId, user.id);
  }
}
