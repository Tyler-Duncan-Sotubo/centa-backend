import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetsReportDto } from './create-assets-report.dto';

export class UpdateAssetsReportDto extends PartialType(CreateAssetsReportDto) {}
