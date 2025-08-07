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
import { CreateOffboardingDto } from './dto/create-offboarding.dto';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';

@Controller('offboarding')
@UseGuards(JwtAuthGuard)
@SetMetadata('permission', ['employees.manage'])
export class OffboardingController extends BaseController {
  constructor(private readonly offboardingService: OffboardingService) {
    super();
  }

  @Post()
  create(
    @Body() createOffboardingDto: CreateOffboardingDto,
    @CurrentUser() user: User,
  ) {
    return this.offboardingService.create(createOffboardingDto, user);
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
