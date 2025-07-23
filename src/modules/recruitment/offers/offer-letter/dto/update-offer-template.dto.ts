import { PartialType } from '@nestjs/mapped-types';
import { CreateOfferTemplateDto } from './create-offer-template.dto';

export class UpdateOfferTemplateDto extends PartialType(
  CreateOfferTemplateDto,
) {}
