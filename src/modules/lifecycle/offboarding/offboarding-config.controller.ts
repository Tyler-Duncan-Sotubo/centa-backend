import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { OffboardingConfigService } from './offboarding-config.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { OffboardingSeederService } from './offboarding-seeder.service';
import { CreateOffboardingConfigDto } from './dto/create-offboarding-config.dto';
import { UpdateOffboardingConfigDto } from './dto/update-offboarding-config.dto';
import { OffboardingChecklistItemDto } from './dto/offboarding-checklist.dto';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('offboarding-config')
@UseGuards(JwtAuthGuard)
@SetMetadata('permission', ['employees.manage'])
export class OffboardingConfigController extends BaseController {
  constructor(
    private readonly configService: OffboardingConfigService,
    private readonly seederService: OffboardingSeederService,
  ) {
    super();
  }

  // ---------- Seed ----------
  @Post('seed')
  async seedDefaults() {
    return this.seederService.seedGlobalOffboardingData();
  }

  // ---------- GET all ----------
  @Get()
  async getAll(@CurrentUser() user: User) {
    return this.configService.getAllTerminationConfig(user.companyId);
  }

  // ---------- Termination Types ----------
  @Post('type')
  async createType(
    @CurrentUser() user: User,
    @Body() dto: CreateOffboardingConfigDto,
  ) {
    return this.configService.createType(user, dto);
  }

  @Patch('type/:id')
  async updateType(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOffboardingConfigDto,
  ) {
    return this.configService.updateType(id, dto, user);
  }

  @Delete('type/:id')
  async deleteType(@Param('id') id: string, @CurrentUser() user: User) {
    return this.configService.deleteType(id, user);
  }

  // ---------- Termination Reasons ----------
  @Post('reason')
  async createReason(
    @CurrentUser() user: User,
    @Body() dto: CreateOffboardingConfigDto,
  ) {
    return this.configService.createReason(user, dto);
  }

  @Patch('reason/:id')
  async updateReason(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOffboardingConfigDto,
  ) {
    return this.configService.updateReason(id, dto, user);
  }

  @Delete('reason/:id')
  async deleteReason(@Param('id') id: string, @CurrentUser() user: User) {
    return this.configService.deleteReason(id, user);
  }

  // ---------- Checklist Items ----------
  @Post('checklist')
  async createChecklistItem(
    @CurrentUser() user: User,
    @Body() dto: OffboardingChecklistItemDto,
  ) {
    return this.configService.createChecklistItem(user, dto);
  }

  @Patch('checklist/:id')
  async updateChecklistItem(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: OffboardingChecklistItemDto,
  ) {
    return this.configService.updateChecklistItem(id, dto, user);
  }

  @Delete('checklist/:id')
  async deleteChecklistItem(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.configService.deleteChecklistItem(id, user);
  }
}
