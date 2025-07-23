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
import { PipelineService } from './pipeline.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { PipelineSeederService } from './pipeline-seeder.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';

@Controller('pipeline')
export class PipelineController extends BaseController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly pipelineSeedService: PipelineSeederService,
  ) {
    super();
  }

  @Post('clone-seed')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  cloneTemplateForCompany(
    @Body('templateId') templateId: string,
    @Body('templateName') templateName: string,
    @CurrentUser() user: User,
  ) {
    return this.pipelineSeedService.cloneTemplateForCompany(
      templateId,
      user,
      templateName,
    );
  }

  @Post('template')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  async createTemplate(
    @Body() createPipelineDto: CreatePipelineDto,
    @CurrentUser() user: User,
  ) {
    return this.pipelineService.createTemplate(user, createPipelineDto);
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  async findAllTemplates(@CurrentUser() user: User) {
    console.log('Fetching all pipeline templates for company:', user.companyId);
    return this.pipelineService.findAllTemplates(user.companyId);
  }

  @Get('template/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  findOne(@Param('id') id: string) {
    return this.pipelineService.findTemplateWithStages(id);
  }

  @Patch('template/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  update(
    @Param('id') id: string,
    @Body() updatePipelineDto: UpdatePipelineDto,
    @CurrentUser() user: User,
  ) {
    return this.pipelineService.updateTemplate(id, user, updatePipelineDto);
  }

  @Delete('template/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.pipelineService.deleteTemplate(id, user);
  }
}
