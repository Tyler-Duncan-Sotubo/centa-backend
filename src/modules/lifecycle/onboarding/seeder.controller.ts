import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  Get,
  Patch,
} from '@nestjs/common';
import { OnboardingSeederService } from './seeder.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateOnboardingTemplateDto } from './dto/create-onboarding-template.dto';

@Controller('onboarding-seeder')
export class OnboardingSeederController extends BaseController {
  constructor(private readonly seeder: OnboardingSeederService) {
    super();
  }

  @Post('')
  seedTemplates() {
    return this.seeder.seedAllGlobalTemplates();
  }

  @Get('single-template/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  getGlobalTemplates(@Param('templateId') templateId: string) {
    return this.seeder.getTemplateByIdWithDetails(templateId);
  }

  @Post('clone-seed')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  cloneTemplateForCompany(
    @Body('templateId') templateId: string,
    @Body('templateName') templateName: string,
    @CurrentUser() user: User,
  ) {
    return this.seeder.cloneTemplateForCompany(
      templateId,
      user.companyId,
      templateName,
    );
  }

  @Post('create-company-template')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  createCompanyTemplate(
    @Body() dto: CreateOnboardingTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.seeder.createCompanyTemplate(user.companyId, dto);
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  getCompanyTemplates(@CurrentUser() user: User) {
    return this.seeder.getTemplatesByCompany(user.companyId);
  }

  @Get('templates-all')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  getTemplatesByCompanyWithDetails(@CurrentUser() user: User) {
    return this.seeder.getTemplatesByCompanyWithDetails(user.companyId);
  }

  @Patch('update-template/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.types.manage'])
  updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: CreateOnboardingTemplateDto,
  ) {
    return this.seeder.updateTemplateById(templateId, dto);
  }
}
