import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  SetMetadata,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApplicationFormService } from './applicationForm.service';
import { ConfigDto } from './dto/config.dto';
import { PublicJobsDto } from './dto/public-jobs.dto';
import { CompanyJobsDto } from './dto/company-job.dto';

@Controller('jobs')
export class JobsController extends BaseController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly applicationFormService: ApplicationFormService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  create(@Body() createJobDto: CreateJobDto, @CurrentUser() user: User) {
    return this.jobsService.create(createJobDto, user);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  postJob(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.postJob(id, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.read'])
  findAll(@CurrentUser() user: User) {
    return this.jobsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.read'])
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.update(id, user, updateJobDto);
  }

  @Patch('archive/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.remove(id, user);
  }

  // Application Form Endpoints
  @Post(':jobId/application-form')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  upsertApplicationForm(
    @Param('jobId') jobId: string,
    @Body('config') config: ConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationFormService.upsertApplicationForm(
      jobId,
      user,
      config,
    );
  }

  @Get(':jobId/application-form')
  getApplicationForm(@Param('jobId') jobId: string) {
    return this.applicationFormService.getFormPreview(jobId);
  }

  @Get('application-form/field-definitions')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  getApplicationFields() {
    return this.applicationFormService.getDefaultFields();
  }

  // Public Endpoints
  @Get('public')
  findPublicJobs(@Query() filters: PublicJobsDto) {
    return this.jobsService.publicJobs(filters);
  }

  @Get('public/job')
  publicJob(@Query('id') id: string) {
    return this.jobsService.publicJob(id);
  }

  @Get('company-jobs')
  async findCompanyJobs(@Query() query: CompanyJobsDto) {
    return this.jobsService.publicCompanyJobs(query);
  }
}
