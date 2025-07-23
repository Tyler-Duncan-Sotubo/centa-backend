import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  Query,
  Patch,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetOfferTemplateVariablesDto } from './dto/get-offer-template-variables.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { SendOffersService } from './send-offer.service';
import { SignOfferDto } from './dto/signed-offer.dto';

@Controller('offers')
export class OffersController extends BaseController {
  constructor(
    private readonly offersService: OffersService,
    private readonly sendOffersService: SendOffersService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['offers.manage'])
  create(@Body() createOfferDto: CreateOfferDto, @CurrentUser() user: User) {
    return this.offersService.create(createOfferDto, user);
  }

  @Get('variables')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['offers.manage'])
  getTemplateVariables(
    @Query() dto: GetOfferTemplateVariablesDto,
    @CurrentUser() user: User,
  ) {
    return this.offersService.getTemplateVariablesWithAutoFilledData(
      dto.templateId,
      dto.applicationId,
      user,
    );
  }

  @Get('variables/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['offers.manage'])
  getTemplateVariablesFromOffer(@Param('id') id: string) {
    return this.offersService.getTemplateVariablesFromOffer(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['offers.manage'])
  findAll(@CurrentUser() user: User) {
    return this.offersService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['offers.manage'])
  update(
    @Param('id') id: string,
    @Body() updateOfferDto: UpdateOfferDto,
    @CurrentUser() user: User,
  ) {
    return this.offersService.update(id, updateOfferDto, user);
  }

  @Post(':offerId/send')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['offers.manage'])
  async sendOffer(
    @Param('offerId') offerId: string,
    @Body('email') email: string,
    @CurrentUser() user: User,
  ) {
    return this.sendOffersService.sendOffer(offerId, email, user);
  }

  @Post('signed')
  async signOffer(@Body() dto: SignOfferDto) {
    return this.offersService.signOffer(dto);
  }

  @Get('verify')
  async verifyOffer(@Query('token') token: string) {
    return this.sendOffersService.getOfferFromToken(token);
  }
}
