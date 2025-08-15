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
import { BlockedDaysService } from './blocked-days.service';
import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('blocked-days')
export class BlockedDaysController extends BaseController {
  constructor(private readonly blockedDaysService: BlockedDaysService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.blocked_days.manage'])
  create(
    @Body() createBlockedDayDto: CreateBlockedDayDto,
    @CurrentUser() user: User,
  ) {
    return this.blockedDaysService.create(createBlockedDayDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.blocked_days.read'])
  findAll(@CurrentUser() user: User) {
    return this.blockedDaysService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.blocked_days.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.blockedDaysService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.blocked_days.manage'])
  update(
    @Param('id') id: string,
    @Body() updateBlockedDayDto: UpdateBlockedDayDto,
    @CurrentUser() user: User,
  ) {
    return this.blockedDaysService.update(id, updateBlockedDayDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['leave.blocked_days.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.blockedDaysService.remove(id, user);
  }
}
