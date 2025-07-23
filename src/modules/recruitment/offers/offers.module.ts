import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { OfferLetterModule } from './offer-letter/offer-letter.module';
import { BullModule } from '@nestjs/bullmq';
import { SendOffersService } from './send-offer.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OfferEmailService } from 'src/modules/notification/services/offer-email.service';

@Module({
  imports: [
    OfferLetterModule,
    BullModule.registerQueue({
      name: 'offerPdfQueue',
    }),
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    SendOffersService,
    OfferEmailService,
    JwtService,
    ConfigService,
  ],
})
export class OffersModule {}
