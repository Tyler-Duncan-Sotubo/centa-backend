import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { FeedbackSettingsController } from './feedback-settings/feedback-settings.controller';
import { FeedbackSettingsService } from './feedback-settings/feedback-settings.service';
import { FeedbackQuestionsController } from './feedback-questions/feedback-question.controller';
import { FeedbackQuestionService } from './feedback-questions/feedback-question.service';

@Module({
  controllers: [
    FeedbackController,
    FeedbackSettingsController,
    FeedbackQuestionsController,
  ],
  providers: [
    FeedbackService,
    FeedbackSettingsService,
    FeedbackQuestionService,
  ],
  exports: [FeedbackService, FeedbackSettingsService, FeedbackQuestionService],
})
export class FeedbackModule {}
