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
import { AssetsRequestService } from './assets-request.service';
import { CreateAssetsRequestDto } from './dto/create-assets-request.dto';
import { UpdateAssetsRequestDto } from './dto/update-assets-request.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';

@Controller('asset-requests')
export class AssetsRequestController extends BaseController {
  constructor(private readonly assetsRequestService: AssetsRequestService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.manage'])
  create(
    @Body() createAssetsRequestDto: CreateAssetsRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.assetsRequestService.create(createAssetsRequestDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.read'])
  findAll(@CurrentUser() user: User) {
    return this.assetsRequestService.findAll(user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.read'])
  findOne(@Param('id') id: string) {
    return this.assetsRequestService.findOne(id);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.read'])
  findByEmployeeId(@Param('id') id: string) {
    return this.assetsRequestService.findByEmployeeId(id);
  }

  @Get(':id/approval-status')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.read'])
  getApprovalStatus(@Param('id') id: string) {
    return this.assetsRequestService.checkApprovalStatus(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.manage'])
  approveExpense(
    @Param('id') id: string,
    @Body('action') action: 'approved' | 'rejected',
    @Body('remarks') remarks: string,
    @CurrentUser() user: User,
  ) {
    return this.assetsRequestService.handleAssetApprovalAction(
      id,
      user,
      action,
      remarks,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['assets.request.manage'])
  update(
    @Param('id') id: string,
    @Body() updateAssetsRequestDto: UpdateAssetsRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.assetsRequestService.update(id, updateAssetsRequestDto, user);
  }
}
