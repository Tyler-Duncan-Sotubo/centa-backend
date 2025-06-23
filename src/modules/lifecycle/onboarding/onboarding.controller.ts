import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingSeederService } from './seeder.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { EmployeeOnboardingInputDto } from './dto/employee-onboarding-input.dto';

@Controller('onboarding')
export class OnboardingController extends BaseController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly seeder: OnboardingSeederService,
  ) {
    super();
  }

  @Get('employees')
  @UseGuards(JwtAuthGuard)
  getEmployeesInOnboarding(@CurrentUser() user: User) {
    return this.onboardingService.getEmployeesInOnboarding(user.companyId);
  }

  @Post('employee')
  @UseGuards(JwtAuthGuard)
  createEmployeeOnboarding(
    @CurrentUser() user: User,
    @Body() dto: EmployeeOnboardingInputDto,
  ) {
    return this.onboardingService.saveEmployeeOnboardingData(
      dto.employeeId,
      dto,
    );
  }

  @Get('employees-onboarding/:employeeId')
  @UseGuards(JwtAuthGuard)
  getEmployeeOnboardingDetail(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.onboardingService.getEmployeeOnboardingDetail(
      user.companyId,
      employeeId,
    );
  }

  @Patch('employee-checklist/:employeeId')
  @UseGuards(JwtAuthGuard)
  updateEmployeeChecklist(
    @Param('employeeId') employeeId: string,
    @Body('checklistId') checklistId: string,
    @Body('status') status: 'pending' | 'completed',
  ) {
    return this.onboardingService.updateChecklistStatus(
      employeeId,
      checklistId,
      status,
    );
  }
}
