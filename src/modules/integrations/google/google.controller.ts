import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { GoogleService } from './google.service';
import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('google')
export class GoogleController extends BaseController {
  constructor(private readonly googleService: GoogleService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  create(@Body() createGoogleDto: CreateGoogleDto, @CurrentUser() user: User) {
    return this.googleService.create(createGoogleDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  findOne(@CurrentUser() user: User) {
    return this.googleService.findOne(user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['jobs.manage'])
  update(@Body() updateGoogleDto: UpdateGoogleDto, @CurrentUser() user: User) {
    return this.googleService.update(user, updateGoogleDto);
  }
}
