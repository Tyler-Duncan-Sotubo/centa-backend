import { ConfigService } from '@nestjs/config';
import { PusherService } from './pusher.service';
import { db } from 'src/drizzle/types/drizzle';
export declare class ChatbotService {
    private configService;
    private pusherService;
    private db;
    private openai;
    constructor(configService: ConfigService, pusherService: PusherService, db: db);
    knowledgeBase: {
        keyword: string;
        answer: string;
    }[];
    checkPredefinedAnswers(userMessage: string): Promise<string | null>;
    chatWithAI(userMessage: string, chatId: string): Promise<void>;
    isFinancialQuery(message: string): boolean;
    fetchUserPayrollData(chatId: string): Promise<{
        payslip_id: string;
        payroll_run_id: string;
        gross_salary: number;
        net_salary: number;
        paye_tax: number;
        pension_contribution: number;
        employer_pension_contribution: number;
        nhf_contribution: number | null;
        additionalDeductions: number | null;
        payroll_month: string;
        first_name: string;
        last_name: string;
        status: string | null;
        payment_status: string | null;
        payment_date: string | null;
        taxable_income: number;
        payslip_pdf_url: string | null;
        salaryAdvance: number | null;
    }[] | null>;
}
