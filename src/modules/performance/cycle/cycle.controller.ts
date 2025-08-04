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
import { CycleService } from './cycle.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('performance-cycle')
@UseGuards(JwtAuthGuard)
export class CycleController extends BaseController {
  constructor(private readonly cycleService: CycleService) {
    super();
  }

  @Post()
  @SetMetadata('permissions', ['performance.cycles.manage'])
  create(@Body() createCycleDto: CreateCycleDto, @CurrentUser() user: User) {
    return this.cycleService.create(createCycleDto, user.companyId, user.id);
  }

  @Get()
  @SetMetadata('permissions', ['performance.cycles.read'])
  findAll(@CurrentUser() user: User) {
    return this.cycleService.findAll(user.companyId);
  }

  @Get('current')
  @SetMetadata('permissions', ['performance.cycles.read'])
  findCurrent(@CurrentUser() user: User) {
    return this.cycleService.findCurrent(user.companyId);
  }

  @Get(':id')
  @SetMetadata('permissions', ['performance.cycles.read'])
  findOne(@Param('id') id: string) {
    return this.cycleService.findOne(id);
  }

  @Patch(':id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  update(
    @Param('id') id: string,
    @Body() updateCycleDto: UpdateCycleDto,
    @CurrentUser() user: User,
  ) {
    return this.cycleService.update(id, updateCycleDto, user);
  }

  @Delete(':id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cycleService.remove(id, user);
  }
}
