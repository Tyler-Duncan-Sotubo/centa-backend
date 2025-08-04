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
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController extends BaseController {
  constructor(private readonly feedbackService: FeedbackService) {
    super();
  }

  // Submit feedback (self, peer, or manager)
  @Post()
  @SetMetadata('permissions', [
    'performance.reviews.submit_self',
    'performance.reviews.submit_peer',
    'performance.reviews.submit_manager',
  ])
  create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @CurrentUser() user: User,
  ) {
    return this.feedbackService.create(createFeedbackDto, user);
  }

  // View all feedbacks (admin/super admin)
  @Get()
  @SetMetadata('permissions', ['performance.reviews.read'])
  findAll(
    @CurrentUser() user: User,
    @Query('type') type?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.feedbackService.findAll(user.companyId, {
      type,
      departmentId,
    });
  }

  // Get feedback visible to the current viewer for a given recipient
  @Get('recipient/:recipientId')
  @SetMetadata('permissions', [
    'performance.reviews.read',
    'performance.reviews.read_team',
    'performance.reviews.manage_all',
  ])
  getForRecipient(
    @Param('recipientId') recipientId: string,
    @CurrentUser() user: User,
  ) {
    return this.feedbackService.getFeedbackForRecipient(recipientId, user);
  }

  // Get a specific feedback item (if the user has access)
  @Get(':id')
  @SetMetadata('permissions', ['performance.reviews.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.feedbackService.findOne(id, user);
  }

  // Update feedback (if user is owner or admin)
  @Patch(':id')
  @SetMetadata('permissions', ['performance.reviews.manage_all'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackDto,
    @CurrentUser() user: User,
  ) {
    return this.feedbackService.update(id, dto, user);
  }

  // Delete feedback (admin or owner)
  @Delete(':id')
  @SetMetadata('permissions', ['performance.reviews.manage_all'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.feedbackService.remove(id, user);
  }
}
