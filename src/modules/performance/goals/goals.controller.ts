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
  Query,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalActivityService } from './goal-activity.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddGoalProgressDto } from './dto/add-goal-progress.dto';
import { AddGoalCommentDto } from './dto/add-goal-comment.dto';
import { UploadGoalAttachmentDto } from './dto/upload-goal-attachment.dto';
import { UpdateGoalAttachmentDto } from './dto/update-goal-attachment.dto';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('performance-goals')
@UseGuards(JwtAuthGuard)
export class GoalsController extends BaseController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly activityService: GoalActivityService,
  ) {
    super();
  }

  @Post()
  @SetMetadata('permissions', ['performance.goals.create'])
  create(@Body() dto: CreateGoalDto, @CurrentUser() user: User) {
    return this.goalsService.create(dto, user);
  }

  @Get()
  @SetMetadata('permissions', ['performance.goals.read'])
  findAll(@CurrentUser() user: User, @Query('status') status: string) {
    return this.goalsService.findAll(user.companyId, status);
  }

  @Get('employee/:employeeId')
  @SetMetadata('permissions', ['performance.goals.read'])
  findAllByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ) {
    return this.goalsService.findAllByEmployeeId(
      user.companyId,
      employeeId,
      status,
    );
  }

  @Get(':id')
  @SetMetadata('permissions', ['performance.goals.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.goalsService.findOne(id, user.companyId);
  }

  @Get('status-counts')
  @SetMetadata('permissions', ['performance.goals.read'])
  async getStatusCounts(@CurrentUser() user: User) {
    return this.goalsService.getStatusCount(user.companyId);
  }

  @Get('status-counts/employee/:employeeId')
  @SetMetadata('permissions', ['performance.goals.read'])
  async getStatusCountsForEmployee(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.goalsService.getStatusCountForEmployee(
      user.companyId,
      employeeId,
    );
  }

  @Patch(':id')
  @SetMetadata('permissions', ['performance.goals.edit'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: User,
  ) {
    return this.goalsService.update(id, dto, user);
  }

  @Patch(':id/publish')
  @SetMetadata('permissions', ['performance.goals.edit'])
  publish(@Param('id') id: string) {
    return this.goalsService.publishGoalAndSubGoals(id);
  }

  @Delete(':id')
  @SetMetadata('permissions', ['performance.goals.edit'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.goalsService.remove(id, user);
  }

  @Delete(':id/:employeeId/archive')
  @SetMetadata('permissions', ['performance.goals.edit'])
  archiveForEmployee(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    return this.goalsService.archiveForEmployee(id, employeeId, user);
  }

  // ------- Progress Updates -------
  @Post(':id/progress')
  @SetMetadata('permissions', ['performance.goals.edit'])
  addProgress(
    @Param('id') goalId: string,
    @Body() dto: AddGoalProgressDto,
    @CurrentUser() user: User,
  ) {
    return this.activityService.addProgressUpdate(goalId, dto, user);
  }

  @Get(':id/progress')
  @SetMetadata('permissions', ['performance.goals.read'])
  getProgress(@Param('id') goalId: string, @CurrentUser() user: User) {
    return this.activityService.getLatestProgressValue(goalId, user.companyId);
  }

  // ------- Comments -------
  @Post(':id/comments')
  @SetMetadata('permissions', ['performance.goals.edit'])
  addComment(
    @Param('id') goalId: string,
    @Body() dto: AddGoalCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.activityService.addComment(goalId, user, dto);
  }

  @Patch('comments/:commentId')
  @SetMetadata('permissions', ['performance.goals.edit'])
  updateComment(
    @Param('commentId') commentId: string,
    @Body('comment') comment: string,
    @CurrentUser() user: User,
  ) {
    return this.activityService.updateComment(commentId, user, comment);
  }

  @Delete('comments/:commentId')
  @SetMetadata('permissions', ['performance.goals.edit'])
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.activityService.deleteComment(commentId, user);
  }

  // ------- Attachments -------
  @Post(':id/attachments')
  @SetMetadata('permissions', ['performance.goals.edit'])
  uploadAttachment(
    @Param('id') goalId: string,
    @Body() dto: UploadGoalAttachmentDto,
    @CurrentUser() user: User,
  ) {
    return this.activityService.uploadGoalAttachment(goalId, dto, user);
  }

  @Patch('attachments/:attachmentId')
  @SetMetadata('permissions', ['performance.goals.edit'])
  updateAttachment(
    @Param('attachmentId') attachmentId: string,
    @Body() dto: UpdateGoalAttachmentDto,
    @CurrentUser() user: User,
  ) {
    return this.activityService.updateAttachment(attachmentId, user, dto);
  }

  @Delete('attachments/:attachmentId')
  @SetMetadata('permissions', ['performance.goals.edit'])
  deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.activityService.deleteAttachment(attachmentId, user);
  }
}
