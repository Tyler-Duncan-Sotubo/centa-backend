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
  Ip,
  UseInterceptors,
} from '@nestjs/common';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@Controller('shifts')
export class ShiftsController extends BaseController {
  constructor(private readonly shiftsService: ShiftsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shifts.manage'])
  create(
    @Body() createShiftDto: CreateShiftDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.shiftsService.create(createShiftDto, user, ip);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shifts.manage'])
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.shiftsService.bulkCreate(user.companyId, rows);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shifts.read'])
  findAll(@CurrentUser() user: User) {
    return this.shiftsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shifts.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shiftsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shifts.manage'])
  update(
    @Param('id') id: string,
    @Body() updateShiftDto: UpdateShiftDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.shiftsService.update(id, updateShiftDto, user, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shifts.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shiftsService.remove(id, user);
  }
}
