"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
const config_1 = require("@nestjs/config");
const pusher_service_1 = require("./pusher.service");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
let ChatbotService = class ChatbotService {
    constructor(configService, pusherService, db) {
        this.configService = configService;
        this.pusherService = pusherService;
        this.db = db;
        this.knowledgeBase = [
            {
                keyword: 'minimum wage',
                answer: 'The current minimum wage in Nigeria is ₦30,000 per month, as per the National Minimum Wage Act of 2019. However, this amount can vary based on state legislation and specific sectors.',
            },
            {
                keyword: 'salary delay',
                answer: 'Salaries are typically processed between the 25th and 30th of the month. If there is a delay, it is advisable to consult with the Human Resources or Accounts department to understand the cause and expected resolution time.',
            },
            {
                keyword: 'paye tax',
                answer: `PAYE (Pay As You Earn) tax in Nigeria is deducted from employees’ salaries based on a progressive tax system. The rates are as follows:
    - First ₦300,000: 7% (₦21,000)
    - Next ₦300,000: 11% (₦33,000)
    - Next ₦500,000: 15% (₦75,000)
    - Next ₦500,000: 19% (₦95,000)
    - Next ₦1,600,000: 21% (₦336,000)
    - Above ₦3,200,000: 24% of the amount exceeding ₦3,200,000
    For example, an annual taxable income of ₦4,000,000 would be taxed as follows:
    - First ₦300,000 at 7%: ₦21,000
    - Next ₦300,000 at 11%: ₦33,000
    - Next ₦500,000 at 15%: ₦75,000
    - Next ₦500,000 at 19%: ₦95,000
    - Next ₦1,600,000 at 21%: ₦336,000
    - Remaining ₦800,000 at 24%: ₦192,000
    Total annual tax: ₦752,000
    Monthly PAYE deduction: ₦62,666.67
    `,
            },
            {
                keyword: 'pension contribution',
                answer: 'In Nigeria, employers contribute 10% of an employee’s gross salary to the pension fund, while employees contribute 8%, in accordance with the Pension Reform Act. These contributions are aimed at ensuring financial security for employees upon retirement.',
            },
            {
                keyword: 'overtime policy',
                answer: "Overtime pay policies can vary by company. Generally, employees receive 1.5 times their hourly rate for extra hours worked beyond the standard workweek and 2 times the hourly rate for work done during weekends or public holidays. It's important to consult your company's specific overtime policy for precise details.",
            },
            {
                keyword: 'nhf contribution',
                answer: "The National Housing Fund (NHF) mandates a contribution of 2.5% of an employee's monthly income. This fund is managed by the Federal Mortgage Bank of Nigeria and aims to provide affordable housing options for contributors.",
            },
            {
                keyword: 'salary structure',
                answer: 'Salary structures in Nigeria typically consist of the basic salary, various allowances (such as housing, transportation, and medical), deductions (including PAYE tax, pension contributions, and NHF), and performance-based bonuses. The exact structure can vary depending on the employer and industry.',
            },
            {
                keyword: 'payroll cycle',
                answer: "Most companies in Nigeria operate on a monthly payroll cycle, with salary payments made at the end of each month. However, some organizations may have different payroll schedules, so it's advisable to confirm with your employer.",
            },
            {
                keyword: 'leave allowance',
                answer: 'Employees are generally entitled to an annual leave allowance, which is typically 10% of their annual basic salary. This allowance is provided to support employees during their leave period and may vary depending on company policy.',
            },
            {
                keyword: 'gratuity',
                answer: 'Gratuity is a lump sum payment made to employees upon retirement or completion of a specified period of service. The amount is usually based on the employee’s length of service and final salary, but it largely depends on the company’s policy and employment contract terms.',
            },
            {
                keyword: 'salary advance',
                answer: 'Some companies offer salary advances, allowing employees to access a portion of their upcoming salary before the regular payday. The advanced amount is typically deducted from the next payroll cycle. Policies regarding salary advances vary by employer.',
            },
            {
                keyword: 'deductions',
                answer: 'Common deductions from an employee’s salary in Nigeria include PAYE tax, pension contributions (8% by the employee and 10% by the employer), NHF contributions (2.5%), and other company-specific deductions such as cooperative society contributions or loan repayments.',
            },
            {
                keyword: 'thirteenth month',
                answer: 'The 13th-month salary is not mandated by Nigerian law, but some companies choose to provide it as a bonus, often paid in December. This practice is at the discretion of the employer and is typically outlined in the employment contract or company policy.',
            },
            {
                keyword: 'net vs gross salary',
                answer: 'Gross salary refers to the total earnings of an employee before any deductions, including basic salary, allowances, and bonuses. Net salary, also known as take-home pay, is the amount an employee receives after all deductions such as taxes and pension contributions have been subtracted.',
            },
            {
                keyword: 'tax clearance',
                answer: 'A Tax Clearance Certificate (TCC) is issued by the Federal Inland Revenue Service (FIRS) to individuals or companies to certify that they have fulfilled all tax obligations. It is often required for various official transactions and tenders.',
            },
            {
                keyword: 'payroll discrepancies',
                answer: 'Common payroll discrepancies include incorrect salary payments, miscalculated deductions, and delays in salary disbursement. To resolve these issues, it is important to maintain accurate records, conduct regular payroll audits, and ensure clear communication between the payroll department and employees.',
            },
            {
                keyword: 'payroll taxes',
                answer: 'Payroll taxes in Nigeria encompass various statutory deductions such as PAYE tax, pension contributions, and NHF contributions. These taxes are mandatory and are deducted at source by the employer before disbursing salaries to employees.',
            },
            {
                keyword: 'taxable income',
                answer: 'Taxable income is the portion of an employee’s earnings that is subject to tax, after allowable deductions such as pension contributions and NHF have been subtracted from the gross income.',
            },
            {
                keyword: 'tax reliefs',
                answer: 'In Nigeria, employees are entitled to certain tax reliefs, including Consolidated Relief Allowance (CRA), which reduces the taxable income and thereby the tax payable. The CRA is calculated as ₦200,000 or 1% of gross income, whichever is higher, plus 20% of gross income.',
            },
        ];
        this.openai = new openai_1.OpenAI({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }
    async checkPredefinedAnswers(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        const predefinedAnswer = this.knowledgeBase.find((item) => lowerMessage.includes(item.keyword));
        return predefinedAnswer ? predefinedAnswer.answer : null;
    }
    async chatWithAI(userMessage, chatId) {
        const systemPrompt = `You are a payroll assistant AI. Help with payroll, salaries, and financial queries. 
    If the user requests a financial report or payroll analysis, respond with accurate data. ALWAYS RETURN IN MARKDOWN FORMAT.`;
        const predefinedAnswer = await this.checkPredefinedAnswers(userMessage);
        if (predefinedAnswer) {
            await this.pusherService.triggerEvent(`chat-${chatId}`, 'new-message', {
                message: predefinedAnswer,
            });
            return;
        }
        let extraData = '';
        if (this.isFinancialQuery(userMessage)) {
            const userPayrollData = await this.fetchUserPayrollData(chatId);
            if (userPayrollData) {
                extraData = `User Payroll Data:\n${JSON.stringify(userPayrollData, null, 2)}`;
            }
        }
        const stream = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
                { role: 'system', content: extraData },
            ],
            stream: true,
        });
        let fullMessage = '';
        for await (const part of stream) {
            const messageChunk = part.choices[0]?.delta?.content || '';
            if (messageChunk) {
                fullMessage += messageChunk;
            }
        }
        await this.pusherService.triggerEvent(`chat-${chatId}`, 'new-message', {
            message: fullMessage,
        });
    }
    isFinancialQuery(message) {
        const keywords = [
            'financial report',
            'payroll analysis',
            'salary breakdown',
            'income statement',
            'salary history',
            'payroll summary',
            'expense report',
            'monthly salary',
            'tax report',
            'payslip details',
            'payroll',
            'salary',
        ];
        return keywords.some((keyword) => message.toLowerCase().includes(keyword));
    }
    async fetchUserPayrollData(chatId) {
        try {
            const companyPayslips = this.db
                .select({
                payslip_id: payroll_schema_1.payslips.id,
                payroll_run_id: payroll_schema_1.payroll.payroll_run_id,
                gross_salary: payroll_schema_1.payroll.gross_salary,
                net_salary: payroll_schema_1.payroll.net_salary,
                paye_tax: payroll_schema_1.payroll.paye_tax,
                pension_contribution: payroll_schema_1.payroll.pension_contribution,
                employer_pension_contribution: payroll_schema_1.payroll.employer_pension_contribution,
                nhf_contribution: payroll_schema_1.payroll.nhf_contribution,
                additionalDeductions: payroll_schema_1.payroll.custom_deductions,
                payroll_month: payroll_schema_1.payroll.payroll_month,
                first_name: employee_schema_1.employees.first_name,
                last_name: employee_schema_1.employees.last_name,
                status: payroll_schema_1.payroll.approval_status,
                payment_status: payroll_schema_1.payroll.payment_status,
                payment_date: payroll_schema_1.payroll.payment_date,
                taxable_income: payroll_schema_1.payroll.taxable_income,
                payslip_pdf_url: payroll_schema_1.payslips.pdf_url,
                salaryAdvance: payroll_schema_1.payroll.salary_advance,
            })
                .from(payroll_schema_1.payslips)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, chatId))
                .innerJoin(payroll_schema_1.payroll, (0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_id, payroll_schema_1.payroll.id))
                .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
                .execute();
            return companyPayslips;
        }
        catch (error) {
            console.error('Error fetching payroll data:', error);
            return null;
        }
    }
};
exports.ChatbotService = ChatbotService;
exports.ChatbotService = ChatbotService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        pusher_service_1.PusherService, Object])
], ChatbotService);
//# sourceMappingURL=chatbot.service.js.map