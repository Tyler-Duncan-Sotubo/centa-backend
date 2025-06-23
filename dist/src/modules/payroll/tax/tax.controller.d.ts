import { TaxService } from './tax.service';
import { FastifyReply } from 'fastify';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class TaxController extends BaseController {
    private readonly taxService;
    constructor(taxService: TaxService);
    downloadExcel(tax_filing_id: string, reply: FastifyReply): Promise<undefined>;
    downloadVoluntary(type: string, month: string, reply: FastifyReply): Promise<undefined>;
    getCompanyTaxFilings(user: User): Promise<{
        id: string;
        tax_type: string;
        total_deductions: number;
        status: string | null;
        month: string;
    }[]>;
    updateCompanyTaxFilings(id: string, status: string): Promise<any>;
    createCompanyTaxFiling(user: User): Promise<{
        message: string;
    }>;
}
