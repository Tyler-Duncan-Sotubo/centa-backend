import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { CommentService } from './comment.service';
import { ReactionService } from './reaction.service';
import { CategoryService } from './category.service';

@Module({
  controllers: [AnnouncementController],
  providers: [
    AnnouncementService,
    CommentService,
    ReactionService,
    CategoryService,
  ],
})
export class AnnouncementModule {}
