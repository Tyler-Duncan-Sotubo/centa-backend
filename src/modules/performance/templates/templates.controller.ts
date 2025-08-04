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
import { PerformanceTemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class PerformanceTemplatesController extends BaseController {
  constructor(private readonly templatesService: PerformanceTemplatesService) {
    super();
  }

  @Post()
  @SetMetadata('permissions', ['performance.cycles.manage'])
  create(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.create(user, createTemplateDto);
  }

  @Get()
  @SetMetadata('permissions', ['performance.cycles.read'])
  findAll(@CurrentUser() user: User) {
    return this.templatesService.findAll(user.companyId);
  }

  @Get(':id')
  @SetMetadata('permissions', ['performance.cycles.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.templatesService.findOne(id, user.companyId);
  }

  @Patch(':templateId')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  update(
    @Param('templateId') templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.update(templateId, updateTemplateDto, user);
  }

  @Delete(':templateId')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  remove(@Param('templateId') templateId: string, @CurrentUser() user: User) {
    return this.templatesService.remove(templateId, user);
  }

  @Post(':templateId/questions')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  assignQuestions(
    @Param('templateId') templateId: string,
    @Body('questionIds') questionIds: string[],
    @CurrentUser() user: User,
  ) {
    return this.templatesService.assignQuestions(templateId, questionIds, user);
  }

  @Delete(':templateId/questions/:questionId')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  removeQuestion(
    @Param('templateId') templateId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.removeQuestion(templateId, questionId, user);
  }
}
