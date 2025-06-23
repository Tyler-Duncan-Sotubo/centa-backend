import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  Delete,
} from '@nestjs/common';
import { OffCycleService } from './off-cycle.service';
import { CreateOffCycleDto } from './dto/create-off-cycle.dto';
// import { UpdateOffCycleDto } from './dto/update-off-cycle.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { PayrollRunDto } from './dto/run-off-cylce.dto';

@Controller('off-cycle')
export class OffCycleController extends BaseController {
  constructor(private readonly offCycleService: OffCycleService) {
    super();
  }

  @Post('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.off_cycle.manage'])
  create(
    @Body() createOffCycleDto: CreateOffCycleDto,
    @CurrentUser() user: User,
  ) {
    return this.offCycleService.create(createOffCycleDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.off_cycle.read'])
  findAll(
    @CurrentUser() user: User,
    @Param('payrollDate') payrollDate: string, // Assuming employeeId is passed as a URL parameter
  ) {
    return this.offCycleService.findAll(user.companyId, payrollDate);
  }

  @Post('run-off-cycle/:runId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.off_cycle.manage'])
  runOffCycle(
    @Body() dto: PayrollRunDto,
    @CurrentUser() user: User,
    @Param('runId') runId: string,
  ) {
    return this.offCycleService.calculateAndPersistOffCycle(
      runId,
      user,
      dto.payrollDate,
    );
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.offCycleService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateOffCycleDto: UpdateOffCycleDto,
  // ) {
  //   return this.offCycleService.update(+id, updateOffCycleDto);
  // }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.off_cycle.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.offCycleService.remove(id, user);
  }
}
