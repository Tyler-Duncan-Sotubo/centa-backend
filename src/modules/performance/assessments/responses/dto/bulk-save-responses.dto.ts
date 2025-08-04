import { Type } from 'class-transformer';
import { ValidateNested, ArrayNotEmpty } from 'class-validator';
import { SaveResponseDto } from './save-response.dto';

export class BulkSaveResponsesDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaveResponseDto)
  responses: SaveResponseDto[];
}
