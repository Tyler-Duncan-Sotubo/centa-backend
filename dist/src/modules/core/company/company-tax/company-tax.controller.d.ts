import { CompanyTaxService } from './company-tax.service';
import { CreateCompanyTaxDto } from './dto/create-company-tax.dto';
import { UpdateCompanyTaxDto } from './dto/update-company-tax.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class CompanyTaxController extends BaseController {
    private readonly companyTaxService;
    constructor(companyTaxService: CompanyTaxService);
    create(createCompanyTaxDto: CreateCompanyTaxDto, user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date | null;
        companyId: string;
        tin: string;
        vatNumber: string | null;
        nhfCode: string | null;
        pensionCode: string | null;
    }>;
    findOne(user: User): Promise<{
        id: string;
        companyId: string;
        tin: string;
        vatNumber: string | null;
        nhfCode: string | null;
        pensionCode: string | null;
        createdAt: Date;
        updatedAt: Date | null;
    }>;
    update(updateCompanyTaxDto: UpdateCompanyTaxDto, user: User): Promise<{
        id: string;
        companyId: string;
        tin: string;
        vatNumber: string | null;
        nhfCode: string | null;
        pensionCode: string | null;
        createdAt: Date;
        updatedAt: Date | null;
    }>;
}
