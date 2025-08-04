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
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from './dto/update-appraisal-cycle.dto';
import { AppraisalCycleService } from './appraisal-cycle.service';
import { AppraisalsService } from './appraisals.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { UpdateAppraisalDto } from './dto/update-appraisal.dto';
import { AppraisalEntriesService } from './appraisal-entries.service';
import { UpsertEntryDto } from './dto/upsert-entry.dto';

@Controller('appraisals')
@UseGuards(JwtAuthGuard)
@SetMetadata('permissions', ['performance.cycles.manage'])
export class AppraisalsController extends BaseController {
  constructor(
    private readonly appraisalsCycleService: AppraisalCycleService,
    private readonly appraisalsService: AppraisalsService,
    private readonly appraisalEntriesService: AppraisalEntriesService,
  ) {
    super();
  }

  @Post('cycle')
  create(@Body() dto: CreateAppraisalCycleDto, @CurrentUser() user: User) {
    return this.appraisalsCycleService.create(dto, user.companyId, user.id);
  }

  @Get('cycle')
  findAll(@CurrentUser() user: User) {
    return this.appraisalsCycleService.findAll(user.companyId);
  }

  @Get('cycle/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appraisalsCycleService.findOne(id, user.companyId);
  }

  @Get('cycle/current')
  findCurrent(@CurrentUser() user: User) {
    return this.appraisalsCycleService.findCurrent(user.companyId);
  }

  @Patch('cycle/:id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppraisalCycleDto,
    @CurrentUser() user: User,
  ) {
    return this.appraisalsCycleService.update(id, updateDto, user);
  }

  @Delete('cycle/:id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appraisalsCycleService.remove(id, user);
  }

  // Appraisal-specific endpoints
  @Post()
  createAppraisal(
    @Body() createDto: CreateAppraisalDto,
    @CurrentUser() user: User,
  ) {
    return this.appraisalsService.create(createDto, user.companyId, user.id);
  }

  @Get(':cycleId/appraisals')
  findAllAppraisals(
    @Param('cycleId') cycleId: string,
    @CurrentUser() user: User,
  ) {
    return this.appraisalsService.findAll(user.companyId, cycleId);
  }

  @Patch(':id/manager')
  async updateManager(
    @Param('id') appraisalId: string,
    @Body() body: { managerId: string },
    @CurrentUser() user: User, // assume a custom decorator
  ) {
    return this.appraisalsService.updateManager(
      appraisalId,
      body.managerId,
      user,
    );
  }

  @Get(':id')
  findOneAppraisal(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appraisalsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  updateAppraisal(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppraisalDto,
    @CurrentUser() user: User,
  ) {
    return this.appraisalsService.update(id, updateDto, user);
  }

  @Delete(':id')
  removeAppraisal(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appraisalsService.remove(id, user);
  }

  // Appraisal entries management
  @Get(':id/entries')
  async getEntries(@Param('id') appraisalId: string) {
    return this.appraisalEntriesService.getAppraisalEntriesWithExpectations(
      appraisalId,
    );
  }

  @Post(':id/entries')
  async upsertEntries(
    @Param('id') appraisalId: string,
    @Body() entries: UpsertEntryDto[],
    @CurrentUser() user: User,
  ) {
    return this.appraisalEntriesService.upsertEntries(
      appraisalId,
      entries,
      user,
    );
  }

  @Delete(':id/restart')
  async restartAppraisal(
    @Param('id') appraisalId: string,
    @CurrentUser() user: User,
  ) {
    return this.appraisalsService.restartAppraisal(appraisalId, user);
  }
}
