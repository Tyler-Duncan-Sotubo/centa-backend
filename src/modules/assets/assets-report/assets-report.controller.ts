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
import { AssetsReportService } from './assets-report.service';
import { CreateAssetsReportDto } from './dto/create-assets-report.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';

@Controller('asset-reports')
export class AssetsReportController extends BaseController {
  constructor(private readonly assetsReportService: AssetsReportService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  create(
    @Body() createAssetsReportDto: CreateAssetsReportDto,
    @CurrentUser() user: User,
  ) {
    return this.assetsReportService.create(createAssetsReportDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  findAll(@CurrentUser() user: User) {
    return this.assetsReportService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  findOne(@Param('id') id: string) {
    return this.assetsReportService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('status') status: string,
    @Body('assetStatus') assetStatus?: string,
  ) {
    return this.assetsReportService.update(id, user, status, assetStatus);
  }
}
