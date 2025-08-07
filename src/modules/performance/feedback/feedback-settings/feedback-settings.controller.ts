import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  SetMetadata,
  Post,
} from '@nestjs/common';
import { FeedbackSettingsService } from './feedback-settings.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateFeedbackRuleDto } from '../dto/update-feedback-rule.dto';

@Controller('feedback/settings')
@UseGuards(JwtAuthGuard)
export class FeedbackSettingsController extends BaseController {
  constructor(
    private readonly feedbackSettingsService: FeedbackSettingsService,
  ) {
    super();
  }

  @Get()
  @SetMetadata('permissions', ['performance.reviews.read'])
  findOne(@CurrentUser() user: User) {
    return this.feedbackSettingsService.findOne(user.companyId);
  }

  @Patch()
  updateTopLevel(@Body() dto: any, @CurrentUser() user: User) {
    return this.feedbackSettingsService.update(user.companyId, dto, user);
  }

  @Patch('rules')
  updateRule(@Body() dto: UpdateFeedbackRuleDto, @CurrentUser() user: User) {
    return this.feedbackSettingsService.updateSingleRule(
      user.companyId,
      dto,
      user,
    );
  }

  @Post('seed')
  create() {
    return this.feedbackSettingsService.seedCompanies();
  }
}
