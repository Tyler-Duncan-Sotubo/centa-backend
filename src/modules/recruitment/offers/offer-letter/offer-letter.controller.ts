import {
  Controller,
  UseGuards,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Patch,
  SetMetadata,
} from '@nestjs/common';
import { OfferLetterService } from './offer-letter.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';

@Controller('offer-letter')
export class OfferLetterController extends BaseController {
  constructor(private readonly offerLetterService: OfferLetterService) {
    super();
  }

  @Post('clone-company-template')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['offers.manage'])
  async cloneCompanyTemplate(
    @CurrentUser() user: User,
    @Body('templateId') templateId: string,
  ) {
    return this.offerLetterService.cloneCompanyTemplate(user, templateId);
  }

  @Post('create-template')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['offers.manage'])
  async createOfferLetterTemplate(
    @CurrentUser() user: User,
    @Body() createOfferTemplateDto: CreateOfferTemplateDto,
  ) {
    return this.offerLetterService.createCompanyTemplate(
      user,
      createOfferTemplateDto,
    );
  }

  @Get('company-templates')
  @SetMetadata('permissions', ['offers.manage'])
  @UseGuards(JwtAuthGuard)
  async getCompanyOfferLetterTemplates(@CurrentUser() user: User) {
    return this.offerLetterService.getCompanyTemplates(user.companyId);
  }

  @Get('template/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['offers.manage'])
  async getOfferLetterTemplate(
    @CurrentUser() user: User,
    @Param('templateId') templateId: string,
  ) {
    return this.offerLetterService.getTemplateById(templateId, user.companyId);
  }

  @Patch('template/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['offers.manage'])
  async updateOfferLetterTemplate(
    @CurrentUser() user: User,
    @Param('templateId') templateId: string,
    @Body() updateOfferTemplateDto: UpdateOfferTemplateDto,
  ) {
    return this.offerLetterService.updateTemplate(
      templateId,
      user,
      updateOfferTemplateDto,
    );
  }

  @Delete('template/:templateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['offers.manage'])
  async deleteOfferLetterTemplate(
    @CurrentUser() user: User,
    @Param('templateId') templateId: string,
  ) {
    return this.offerLetterService.deleteTemplate(templateId, user);
  }
}
