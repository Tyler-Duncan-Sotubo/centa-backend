import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  SetMetadata,
  Patch,
  Query,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { GetDashboardAssessmentsDto } from './dto/get-dashboard-assessments.dto';

@Controller('performance-assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentsController extends BaseController {
  constructor(private readonly assessmentsService: AssessmentsService) {
    super();
  }

  // Create a new assessment
  @Post()
  create(@Body() dto: CreateAssessmentDto, @CurrentUser() user: User) {
    return this.assessmentsService.createAssessment(dto, user);
  }

  // Start an assessment (by reviewer)
  @Patch(':id/start')
  start(@Param('id') id: string, @CurrentUser() user: User) {
    return this.assessmentsService.startAssessment(id, user.id);
  }

  // Submit section comments (intermediate save)
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @CurrentUser() user: User,
  ) {
    return this.assessmentsService.saveSectionComments(id, user.id, dto);
  }

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: User,
    @Query() filters: GetDashboardAssessmentsDto,
  ) {
    return this.assessmentsService.getAssessmentsForDashboard(
      user.companyId,
      filters,
    );
  }

  @Get('counts')
  getCounts(@CurrentUser() user: User) {
    return this.assessmentsService.getCounts(user.companyId);
  }

  // Get full assessment with related data (self, manager, peer)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.assessmentsService.getAssessmentById(id);
  }

  // Get assessments where user is the reviewee
  @Get('me/list')
  @SetMetadata('permissions', ['performance.reviews.read'])
  getOwnAssessments(@CurrentUser() user: User) {
    return this.assessmentsService.getAssessmentsForUser(user.id);
  }

  @Get('me/self/:employeeId')
  @SetMetadata('permissions', ['performance.reviews.read'])
  getOwnSelfAssessments(@Param('employeeId') employeeId: string) {
    return this.assessmentsService.getAssessmentsForEmployee(employeeId);
  }

  // Get assessments for manager’s direct reports in a cycle
  @Get('team/:cycleId')
  @SetMetadata('permissions', ['performance.reviews.read_team'])
  getTeamAssessments(
    @Param('cycleId') cycleId: string,
    @CurrentUser() user: User,
  ) {
    return this.assessmentsService.getTeamAssessments(user.id, cycleId);
  }

  // Get full summary for a user’s review in a cycle
  @Get('summary/:revieweeId/:cycleId')
  @SetMetadata('permissions', ['performance.reviews.manage_all'])
  getReviewSummary(
    @Param('revieweeId') revieweeId: string,
    @Param('cycleId') cycleId: string,
  ) {
    return this.assessmentsService.getReviewSummary(revieweeId, cycleId);
  }
}
