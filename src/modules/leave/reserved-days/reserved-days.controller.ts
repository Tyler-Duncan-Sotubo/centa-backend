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
import { ReservedDaysService } from './reserved-days.service';
import { CreateReservedDayDto } from './dto/create-reserved-day.dto';
import { UpdateReservedDayDto } from './dto/update-reserved-day.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('reserved-days')
export class ReservedDaysController extends BaseController {
  constructor(private readonly reservedDaysService: ReservedDaysService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reserved_days.manage'])
  create(
    @Body() createReservedDayDto: CreateReservedDayDto,
    @CurrentUser() user: User,
  ) {
    return this.reservedDaysService.create(createReservedDayDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reserved_days.read'])
  findAll(@CurrentUser() user: User) {
    return this.reservedDaysService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reserved_days.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reservedDaysService.findOne(id, user.companyId);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reserved_days.manage'])
  findByEmployee(@Param('id') id: string) {
    return this.reservedDaysService.findByEmployee(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reserved_days.manage'])
  update(
    @Param('id') id: string,
    @Body() updateReservedDayDto: UpdateReservedDayDto,
    @CurrentUser() user: User,
  ) {
    return this.reservedDaysService.update(id, updateReservedDayDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['reserved_days.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reservedDaysService.remove(id, user);
  }
}
