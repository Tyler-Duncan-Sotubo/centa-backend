import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { BonusesService } from './bonuses.service';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('bonuses')
export class BonusesController extends BaseController {
  constructor(private readonly bonusesService: BonusesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.bonuses.manage'])
  create(@Body() createBonusDto: CreateBonusDto, @CurrentUser() user: User) {
    return this.bonusesService.create(user, createBonusDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.bonuses.read'])
  findAll(@CurrentUser() user: User) {
    return this.bonusesService.findAll(user.companyId);
  }

  @Get(':bonusId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.bonuses.read'])
  findOne(@Param('bonusId') bonusId: string) {
    return this.bonusesService.findOne(bonusId);
  }

  @Get('employee-bonuses/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.bonuses.read'])
  findEmployeeBonuses(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    return this.bonusesService.findAllEmployeeBonuses(
      user.companyId,
      employeeId,
    );
  }

  @Patch(':bonusId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.bonuses.manage'])
  update(
    @Param('bonusId') bonusId: string,
    @Body() updateBonusDto: UpdateBonusDto,
    @CurrentUser() user: User,
  ) {
    return this.bonusesService.update(bonusId, updateBonusDto, user);
  }

  @Delete(':bonusId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.bonuses.manage'])
  remove(@Param('bonusId') bonusId: string, @CurrentUser() user: User) {
    return this.bonusesService.remove(user, bonusId);
  }
}
