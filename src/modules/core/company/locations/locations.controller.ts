import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  Post,
  Param,
  UseInterceptors,
  UseGuards,
  SetMetadata,
  Ip,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Audit } from 'src/modules/audit/audit.decorator';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { AssignLocationDto } from './dto/assign-location.dto';

@UseInterceptors(AuditInterceptor)
@Controller('locations')
export class LocationsController extends BaseController {
  constructor(private readonly locationsService: LocationsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.manage'])
  create(
    @Body() createLocationDto: CreateLocationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.locationsService.create(createLocationDto, user, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.read'])
  findAll(@CurrentUser() user: User) {
    return this.locationsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.read'])
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.manage'])
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.locationsService.update(id, updateLocationDto, user, ip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.manage'])
  @Audit({
    action: 'delete',
    entity: 'location',
    getEntityId: (req) => req.params.id,
  })
  remove(@Param('id') id: string) {
    return this.locationsService.softDelete(id);
  }

  // Location Managers
  @Get(':id/managers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.managers'])
  findLocationManagers(@Param('id') id: string) {
    return this.locationsService.getLocationManagers(id);
  }

  @Post(':id/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.managers'])
  @Audit({
    action: 'create',
    entity: 'location_manager',
    getEntityId: (req) => req.params.id,
  })
  addLocationManager(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.locationsService.addLocationManager(id, employeeId);
  }

  @Delete(':id/:employeeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.managers'])
  @Audit({
    action: 'update',
    entity: 'location_manager',
    getEntityId: (req) => req.params.id,
  })
  updateLocationManager(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.locationsService.removeLocationManager(id, employeeId);
  }

  @Patch('assign/employee')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['locations.manage'])
  @Audit({
    action: 'create',
    entity: 'employee_allowed_location',
    getEntityId: (req) => req.body.employeeId,
  })
  addAllowedWorkLocation(
    @Body() dto: AssignLocationDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.locationsService.addAllowedWorkLocationForEmployee(
      dto.employeeId,
      dto.locationId,
      user,
      ip,
    );
  }
}
