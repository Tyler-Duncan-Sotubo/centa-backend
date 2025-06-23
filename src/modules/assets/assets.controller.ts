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
  UseInterceptors,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@Controller('assets')
export class AssetsController extends BaseController {
  constructor(private readonly assetsService: AssetsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  // @SetMetadata('permissions', ['assets.manage'])
  create(@Body() createAssetDto: CreateAssetDto, @CurrentUser() user: User) {
    return this.assetsService.create(createAssetDto, user);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.manage'])
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreate(@Body() rows: any[], @CurrentUser() user: User) {
    return this.assetsService.bulkCreateAssets(user.companyId, rows);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  findAll(@CurrentUser() user: User) {
    return this.assetsService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.read'])
  findByEmployee(@Param('id') id: string) {
    return this.assetsService.findByEmployeeId(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.manage'])
  update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @CurrentUser() user: User,
  ) {
    return this.assetsService.update(id, updateAssetDto, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.manage'])
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: User,
  ) {
    return this.assetsService.changeStatus(id, status, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.manage'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.assetsService.remove(id, user);
  }
}
