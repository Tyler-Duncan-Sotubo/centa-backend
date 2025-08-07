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
import { OffboardingService } from './offboarding.service';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { CreateOffboardingBeginDto } from './dto/create-offboarding.dto';
import { AddOffboardingDetailsDto } from './dto/add-offboarding-details.dto';

@Controller('offboarding')
@UseGuards(JwtAuthGuard)
@SetMetadata('permission', ['employees.manage'])
export class OffboardingController extends BaseController {
  constructor(private readonly offboardingService: OffboardingService) {
    super();
  }

  @Post('begin')
  begin(@Body() dto: CreateOffboardingBeginDto, @CurrentUser() user: User) {
    return this.offboardingService.begin(dto, user);
  }

  @Post(':sessionId/details')
  addDetails(
    @Param('sessionId') sessionId: string,
    @Body() dto: AddOffboardingDetailsDto,
    @CurrentUser() user: User,
  ) {
    return this.offboardingService.addDetails(sessionId, dto, user);
  }

  @Post(':sessionId/cancel')
  cancel(@Param('sessionId') sessionId: string, @CurrentUser() user: User) {
    return this.offboardingService.cancel(sessionId, user);
  }

  @Get('employee/:employeeId')
  findByEmployeeId(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.offboardingService.findByEmployeeId(employeeId, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.offboardingService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.offboardingService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOffboardingDto: UpdateOffboardingDto,
    @CurrentUser() user: User,
  ) {
    return this.offboardingService.update(id, updateOffboardingDto, user);
  }

  @Patch('update-checklist')
  updateChecklist(
    @Body('checklistItemId') checklistItemId: string,
    @CurrentUser() user: User,
  ) {
    return this.offboardingService.updateChecklist(checklistItemId, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.offboardingService.remove(id, user);
  }
}
