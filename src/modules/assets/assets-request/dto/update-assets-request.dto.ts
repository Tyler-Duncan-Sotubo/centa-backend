import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetsRequestDto } from './create-assets-request.dto';

export class UpdateAssetsRequestDto extends PartialType(CreateAssetsRequestDto) {}
