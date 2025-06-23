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
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comments.dto';
import { ReactionService } from './reaction.service';
import { CategoryService } from './category.service';
import { Permission } from '../auth/permissions/permission-keys';

@Controller('announcement')
export class AnnouncementController extends BaseController {
  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly commentService: CommentService,
    private readonly reactionService: ReactionService,
    private readonly categoryService: CategoryService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsManage])
  create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @CurrentUser() user: User,
  ) {
    return this.announcementService.create(createAnnouncementDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsRead])
  findAll(@CurrentUser() user: User) {
    return this.announcementService.findAll(user.companyId);
  }

  @Get('limit-two')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsRead])
  findAllLimitTwo(@CurrentUser() user: User) {
    return this.announcementService.findAllLimitTwo(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsRead])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.announcementService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsManage])
  update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @CurrentUser() user: User,
  ) {
    return this.announcementService.update(id, updateAnnouncementDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsManage])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.announcementService.remove(id, user);
  }

  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsComment])
  createComment(
    @Param('id') id: string,
    @Body() createCommentDto: CreateAnnouncementCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentService.createComment(createCommentDto, id, user);
  }

  @Post('comment/:id/reaction')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsReact])
  reactToComment(
    @Param('id') id: string,
    @Body('reactionType') reactionType: string,
    @CurrentUser() user: User,
  ) {
    return this.commentService.toggleCommentReaction(id, user.id, reactionType);
  }

  @Post(':id/reaction')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsReact])
  likeAnnouncement(
    @Param('id') id: string,
    @Body('reactionType') reactionType: string,
    @CurrentUser() user: User,
  ) {
    return this.reactionService.reactToAnnouncement(id, reactionType, user);
  }

  // 🔥 CATEGORIES
  @Post('category')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsManage])
  createCategory(@Body('name') name: string, @CurrentUser() user: User) {
    return this.categoryService.createCategory(name, user);
  }

  @Patch('category/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsManage])
  updateCategory(
    @Param('id') id: string,
    @Body('name') name: string,
    @CurrentUser() user: User,
  ) {
    return this.categoryService.updateCategory(id, name, user);
  }

  @Delete('category/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsManage])
  deleteCategory(@Param('id') id: string, @CurrentUser() user: User) {
    return this.categoryService.deleteCategory(id, user);
  }

  @Get('category')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', [Permission.AnnouncementsCategoryRead])
  listCategories(@CurrentUser() user: User) {
    return this.categoryService.listCategories(user.companyId);
  }

  @Get('create-elements')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['announcements.read'])
  getCreateElements(@CurrentUser() user: User) {
    return this.announcementService.getAllCreateElements(user.companyId);
  }
}
