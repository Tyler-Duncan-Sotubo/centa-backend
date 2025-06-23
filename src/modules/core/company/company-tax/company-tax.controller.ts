import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CompanyTaxService } from './company-tax.service';
import { CreateCompanyTaxDto } from './dto/create-company-tax.dto';
import { UpdateCompanyTaxDto } from './dto/update-company-tax.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('company-tax')
export class CompanyTaxController extends BaseController {
  constructor(private readonly companyTaxService: CompanyTaxService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.manage'])
  create(
    @Body() createCompanyTaxDto: CreateCompanyTaxDto,
    @CurrentUser() user: User,
  ) {
    return this.companyTaxService.create(createCompanyTaxDto, user);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  findOne(@CurrentUser() user: User) {
    return this.companyTaxService.findOne(user.companyId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.manage'])
  update(
    @Body() updateCompanyTaxDto: UpdateCompanyTaxDto,
    @CurrentUser() user: User,
  ) {
    return this.companyTaxService.update(updateCompanyTaxDto, user);
  }
}
