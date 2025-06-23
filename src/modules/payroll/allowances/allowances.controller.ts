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
import { AllowancesService } from './allowances.service';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('payroll-allowances')
export class AllowancesController {
  constructor(private readonly allowancesService: AllowancesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.allowances.manage'])
  create(
    @Body() createAllowanceDto: CreateAllowanceDto,
    @CurrentUser() user: User,
  ) {
    return this.allowancesService.create(createAllowanceDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.allowances.read'])
  findAll() {
    return this.allowancesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.allowances.read'])
  findOne(@Param('id') id: string) {
    return this.allowancesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.allowances.manage'])
  update(
    @Param('id') id: string,
    @Body() updateAllowanceDto: UpdateAllowanceDto,
    @CurrentUser() user: User,
  ) {
    return this.allowancesService.update(id, updateAllowanceDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.allowances.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.allowancesService.remove(id, user);
  }
}
