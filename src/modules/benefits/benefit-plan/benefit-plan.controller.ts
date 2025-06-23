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
import { BenefitPlanService } from './benefit-plan.service';
import { CreateBenefitPlanDto } from './dto/create-benefit-plan.dto';
import { UpdateBenefitPlanDto } from './dto/update-benefit-plan.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { EnrollBenefitPlanDto } from './dto/enroll-employee.dto';
import { SingleEnrollBenefitDto } from './dto/single-employee-enroll.dto';

@Controller('benefit-plan')
export class BenefitPlanController extends BaseController {
  constructor(private readonly benefitPlanService: BenefitPlanService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_plans.manage'])
  create(
    @Body() createBenefitPlanDto: CreateBenefitPlanDto,
    @CurrentUser() user: User,
  ) {
    return this.benefitPlanService.create(createBenefitPlanDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.read'])
  findAll(@CurrentUser() user: User) {
    return this.benefitPlanService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.read'])
  findOne(@Param('id') id: string) {
    return this.benefitPlanService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_plans.manage'])
  update(
    @Param('id') id: string,
    @Body() updateBenefitPlanDto: UpdateBenefitPlanDto,
    @CurrentUser() user: User,
  ) {
    return this.benefitPlanService.update(id, updateBenefitPlanDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefit_plans.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.benefitPlanService.remove(id, user);
  }

  @Get('enrollments/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.enroll'])
  getEmployeeEnrollments(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.benefitPlanService.getEmployeeBenefitEnrollments(
      employeeId,
      user,
    );
  }

  @Post('enrollments/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.enroll'])
  getEnrollments(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
    @Body() dto: SingleEnrollBenefitDto,
  ) {
    return this.benefitPlanService.selfEnrollToBenefitPlan(
      employeeId,
      dto,
      user,
    );
  }

  @Patch('enrollments/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.enroll'])
  removeEnrollment(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
    @Body('benefitPlanId') benefitPlanId: string,
  ) {
    return this.benefitPlanService.optOutOfBenefitPlan(
      employeeId,
      benefitPlanId,
      user,
    );
  }

  @Post('enroll/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.enroll'])
  enrollEmployees(
    @Body() enrollBenefitPlanDto: EnrollBenefitPlanDto,
    @CurrentUser() user: User,
  ) {
    return this.benefitPlanService.enrollEmployeesToBenefitPlan(
      enrollBenefitPlanDto,
      user,
    );
  }

  @Delete('remove/employees')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['benefits.enroll'])
  removeEmployeesFromBenefit(
    @Body() dto: EnrollBenefitPlanDto,
    @CurrentUser() user: User,
  ) {
    return this.benefitPlanService.removeEmployeesFromBenefitPlan(dto, user);
  }
}
