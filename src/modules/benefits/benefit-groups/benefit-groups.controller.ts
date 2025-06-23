import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { BenefitGroupsService } from './benefit-groups.service';
import { CreateBenefitGroupDto } from './dto/create-benefit-group.dto';
import { UpdateBenefitGroupDto } from './dto/update-benefit-group.dto';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('benefit-groups')
export class BenefitGroupsController extends BaseController {
  constructor(private readonly benefitGroupsService: BenefitGroupsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_groups.manage'])
  create(@Body() dto: CreateBenefitGroupDto, @CurrentUser() user: User) {
    return this.benefitGroupsService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_groups.read'])
  findAll(@CurrentUser() user: User) {
    return this.benefitGroupsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_groups.read'])
  findOne(@Param('id') id: string) {
    return this.benefitGroupsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_groups.manage'])
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBenefitGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.benefitGroupsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_groups.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.benefitGroupsService.remove(id, user);
  }
}
