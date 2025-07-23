// dto/get-offer-template-variables.dto.ts
import { IsUUID } from 'class-validator';

export class GetOfferTemplateVariablesDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  applicationId: string;
}
