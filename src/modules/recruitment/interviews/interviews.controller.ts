import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  Delete,
  Patch,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { ScorecardTemplateService } from './scorecard.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';
import { SubmitFeedbackDto } from './dto/feedback-score.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { InterviewEmailTemplateService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/email-template.dto';

@Controller('interviews')
export class InterviewsController extends BaseController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly scoreCard: ScorecardTemplateService,
    private readonly emailTemplatesService: InterviewEmailTemplateService,
  ) {
    super();
  }

  // Schedule a new interview
  @Post('schedule')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.schedule'])
  scheduleInterview(@Body() dto: ScheduleInterviewDto) {
    return this.interviewsService.scheduleInterview(dto);
  }

  // Reschedule an existing interview
  @Patch(':interviewId/reschedule')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.schedule'])
  rescheduleInterview(
    @Param('interviewId') interviewId: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.interviewsService.rescheduleInterview(interviewId, dto);
  }

  // List all interviews for a company
  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.read'])
  listAllInterviews(@CurrentUser() user: User) {
    return this.interviewsService.findAllInterviews(user.companyId);
  }

  // Get full interview details
  @Get(':interviewId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.read'])
  getInterviewDetails(@Param('interviewId') interviewId: string) {
    return this.interviewsService.getInterviewDetails(interviewId);
  }

  // Submit feedback for an interview
  @Post(':interviewId/feedback')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.submit_feedback'])
  submitInterviewFeedback(
    @Param('interviewId') interviewId: string,
    @Body() dto: SubmitFeedbackDto,
    @CurrentUser() user: User,
  ) {
    return this.interviewsService.upsertInterviewFeedback(
      interviewId,
      dto.scores,
      user,
    );
  }

  // List interviews for a specific application
  @Get('application/:applicationId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.read'])
  listInterviewsForApplication(@Param('applicationId') applicationId: string) {
    return this.interviewsService.listInterviewsForApplication(applicationId);
  }

  // List all feedback submitted for a specific interview
  @Get(':interviewId/feedback')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.read'])
  listInterviewerFeedback(@Param('interviewId') interviewId: string) {
    return this.interviewsService.listInterviewerFeedback(interviewId);
  }

  // Scorecard-related endpoints ------------------------------------------------------
  @Get('scorecards-templates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  getAllScorecards(@CurrentUser() user: User) {
    return this.scoreCard.getAllTemplates(user.companyId);
  }

  @Post('scorecards-templates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  createScorecardTemplate(
    @Body() dto: CreateScorecardTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.scoreCard.create(user, dto);
  }

  @Delete('scorecards-templates/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  deleteScorecardTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: User,
  ) {
    return this.scoreCard.deleteTemplate(templateId, user);
  }

  @Post('scorecards-templates/clone')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  cloneScorecardTemplate(
    @Body('templateId') templateId: string,
    @CurrentUser() user: User,
  ) {
    return this.scoreCard.cloneTemplate(templateId, user);
  }

  // Email templates-related endpoints ------------------------------------------------
  @Get('email-templates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  getAllEmailTemplates(@CurrentUser() user: User) {
    return this.emailTemplatesService.getAllTemplates(user.companyId);
  }

  @Post('email-templates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  createEmailTemplate(
    @Body() dto: CreateEmailTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.emailTemplatesService.create(user, dto);
  }

  @Post('email-templates/clone')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  cloneEmailTemplate(
    @Body('templateId') templateId: string,
    @CurrentUser() user: User,
  ) {
    return this.emailTemplatesService.cloneTemplate(templateId, user);
  }

  @Delete('email-templates/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['interviews.manage'])
  deleteEmailTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: User,
  ) {
    return this.emailTemplatesService.deleteTemplate(templateId, user);
  }
}
