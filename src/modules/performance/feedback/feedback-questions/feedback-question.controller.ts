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
} from '@nestjs/common';
import { FeedbackQuestionService } from './feedback-question.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('feedback-questions')
@UseGuards(JwtAuthGuard)
export class FeedbackQuestionsController extends BaseController {
  constructor(private readonly questionService: FeedbackQuestionService) {
    super();
  }

  @Post()
  @SetMetadata('permissions', ['performance.cycles.manage'])
  create(@Body() dto: CreateFeedbackQuestionDto, @CurrentUser() user: User) {
    return this.questionService.create(dto, user);
  }

  @Get()
  @SetMetadata('permissions', ['performance.reviews.read'])
  findAll(@CurrentUser() user: User) {
    return this.questionService.findAll(user.companyId);
  }

  @Get('type/:type')
  @SetMetadata('permissions', ['performance.reviews.read'])
  findByType(@Param('type') type: string, @CurrentUser() user: User) {
    return this.questionService.findByType(user.companyId, type);
  }

  @Get(':id')
  @SetMetadata('permissions', ['performance.reviews.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.questionService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.questionService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.questionService.delete(user.companyId, id);
  }

  @Patch('reorder/:type')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  reorder(
    @Param('type') type: string,
    @Body() payload: { questions: { id: string; order: number }[] },
    @CurrentUser() user: User,
  ) {
    return this.questionService.reorderQuestionsByType(
      user.companyId,
      type as any,
      payload.questions,
    );
  }
}
