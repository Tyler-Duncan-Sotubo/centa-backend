import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { MoveToStageDto } from './dto/move-to-stage.dto';
import { ChangeApplicationStatusDto } from './dto/chnage-app-status.dto';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

@Controller('applications')
export class ApplicationsController extends BaseController {
  constructor(private readonly applicationsService: ApplicationsService) {
    super();
  }

  @Post('submit')
  submitApplication(
    @Body() createApplicationDto: CreateApplicationDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.submitApplication(
      createApplicationDto,
      user,
    );
  }

  @Get('list/:jobId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['applications.read'])
  listApplicationsByJobKanban(@Param('jobId') jobId: string) {
    return this.applicationsService.listApplicationsByJobKanban(jobId);
  }

  @Get(':applicationId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['applications.read'])
  findOne(@Param('applicationId') applicationId: string) {
    return this.applicationsService.getApplicationDetails(applicationId);
  }

  @Patch('move-stage')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['applications.manage'])
  moveToStage(@Body() dto: MoveToStageDto, @CurrentUser() user: User) {
    return this.applicationsService.moveToStage(dto, user);
  }

  @Patch('change-status')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['applications.manage'])
  changeStatus(
    @Body() dto: ChangeApplicationStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.changeStatus(dto, user);
  }
}
