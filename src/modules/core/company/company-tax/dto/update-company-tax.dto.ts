import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyTaxDto } from './create-company-tax.dto';

export class UpdateCompanyTaxDto extends PartialType(CreateCompanyTaxDto) {}
