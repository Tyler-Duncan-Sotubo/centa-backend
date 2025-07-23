import { IsUUID, IsNotEmpty, IsObject } from 'class-validator';

export class CreateOfferDto {
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @IsObject()
  pdfData: Record<string, any>;

  @IsUUID()
  @IsNotEmpty()
  newStageId: string;
}
