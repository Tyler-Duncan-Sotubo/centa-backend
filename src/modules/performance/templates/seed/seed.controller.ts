import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { PerformanceReviewQuestionService } from './questions.service';
import { PerformanceCompetencyService } from './competency.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { UpdateQuestionsDto } from './dto/update-questions.dto';
import { RoleCompetencyExpectationService } from './role-competency.service';
import { CreateRoleExpectationDto } from './dto/create-role-expectation.dto';
import { UpdateRoleExpectationDto } from './dto/update-role-expectation.dto';

@Controller('performance-seed')
@UseGuards(JwtAuthGuard)
export class SeedController extends BaseController {
  constructor(
    private readonly performanceReviewQuestionService: PerformanceReviewQuestionService,
    private readonly performanceCompetencyService: PerformanceCompetencyService,
    private readonly roleCompetencyExpectationService: RoleCompetencyExpectationService,
  ) {
    super();
  }

  // Create Competency
  @Post('competency')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async createCompetency(
    @CurrentUser() user: User,
    @Body() dto: CreateCompetencyDto,
  ) {
    return this.performanceCompetencyService.create(
      user.companyId,
      dto,
      user.id,
    );
  }

  // Get Competencies
  @Get('competencies')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async getCompetencies(@CurrentUser() user: User) {
    return this.performanceCompetencyService.getCompetenciesWithQuestions(
      user.companyId,
    );
  }

  @Get('only-competencies')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async getOnlyCompetencies(@CurrentUser() user: User) {
    return this.performanceCompetencyService.getOnlyCompetencies(
      user.companyId,
    );
  }

  @Patch('competency/:id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async updateCompetency(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCompetencyDto,
  ) {
    return this.performanceCompetencyService.update(id, user, dto);
  }

  @Delete('competency/:id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async deleteCompetency(@CurrentUser() user: User, @Param('id') id: string) {
    return this.performanceCompetencyService.delete(id, user);
  }

  // Competency Levels
  @Post('competency-levels')
  seedLevels() {
    return this.performanceCompetencyService.seedSystemLevels();
  }

  @Get('competency-levels')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async getLevels() {
    return this.performanceCompetencyService.getAllCompetencyLevels();
  }

  // Role Competency Expectations
  @Post('role-expectations')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async create(
    @Body() dto: CreateRoleExpectationDto,
    @CurrentUser() user: User,
  ) {
    return this.roleCompetencyExpectationService.create(
      user.companyId,
      dto,
      user,
    );
  }

  @Get('role-expectations')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async list(@CurrentUser() user: User) {
    return this.roleCompetencyExpectationService.list(user.companyId);
  }

  @Get('framework')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async getFramework(@CurrentUser() user: User) {
    return this.roleCompetencyExpectationService.getFrameworkSettings(
      user.companyId,
    );
  }

  @Get('framework-fields')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async getFrameworkFields(@CurrentUser() user: User) {
    return this.roleCompetencyExpectationService.getFrameworkFields(
      user.companyId,
    );
  }

  @Patch('role-expectations/:id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleExpectationDto,
    @CurrentUser() user: User,
  ) {
    return this.roleCompetencyExpectationService.update(id, dto, user);
  }

  @Delete('role-expectations/:id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.roleCompetencyExpectationService.delete(id, user);
  }

  // Create Question
  @Post('question')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async createQuestion(
    @CurrentUser() user: User,
    @Body() dto: CreateQuestionsDto,
  ) {
    return this.performanceReviewQuestionService.create(user, dto);
  }

  // Get Questions
  @Get('questions')
  @SetMetadata('permissions', ['performance.cycles.read'])
  async getQuestions(@CurrentUser() user: User) {
    return this.performanceReviewQuestionService.getAll(user.companyId);
  }

  @Patch('question/:id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async updateQuestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionsDto,
  ) {
    return this.performanceReviewQuestionService.update(id, user, dto);
  }

  @Delete('question/:id')
  @SetMetadata('permissions', ['performance.cycles.manage'])
  async deleteQuestion(@CurrentUser() user: User, @Param('id') id: string) {
    return this.performanceReviewQuestionService.delete(id, user);
  }
}
