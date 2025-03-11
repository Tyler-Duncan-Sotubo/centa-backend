import { Injectable, Inject } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { PusherService } from './pusher.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq } from 'drizzle-orm';
import { payroll, payslips } from 'src/drizzle/schema/payroll.schema';
import { employees } from 'src/drizzle/schema/employee.schema';

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private pusherService: PusherService,
    @Inject(DRIZZLE) private db: db,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  knowledgeBase = [
    {
      keyword: 'minimum wage',
      answer:
        'The current minimum wage in Nigeria is ₦30,000 per month, as per the National Minimum Wage Act of 2019. However, this amount can vary based on state legislation and specific sectors.',
    },
    {
      keyword: 'salary delay',
      answer:
        'Salaries are typically processed between the 25th and 30th of the month. If there is a delay, it is advisable to consult with the Human Resources or Accounts department to understand the cause and expected resolution time.',
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
      answer:
        'In Nigeria, employers contribute 10% of an employee’s gross salary to the pension fund, while employees contribute 8%, in accordance with the Pension Reform Act. These contributions are aimed at ensuring financial security for employees upon retirement.',
    },
    {
      keyword: 'overtime policy',
      answer:
        "Overtime pay policies can vary by company. Generally, employees receive 1.5 times their hourly rate for extra hours worked beyond the standard workweek and 2 times the hourly rate for work done during weekends or public holidays. It's important to consult your company's specific overtime policy for precise details.",
    },
    {
      keyword: 'nhf contribution',
      answer:
        "The National Housing Fund (NHF) mandates a contribution of 2.5% of an employee's monthly income. This fund is managed by the Federal Mortgage Bank of Nigeria and aims to provide affordable housing options for contributors.",
    },
    {
      keyword: 'salary structure',
      answer:
        'Salary structures in Nigeria typically consist of the basic salary, various allowances (such as housing, transportation, and medical), deductions (including PAYE tax, pension contributions, and NHF), and performance-based bonuses. The exact structure can vary depending on the employer and industry.',
    },
    {
      keyword: 'payroll cycle',
      answer:
        "Most companies in Nigeria operate on a monthly payroll cycle, with salary payments made at the end of each month. However, some organizations may have different payroll schedules, so it's advisable to confirm with your employer.",
    },
    {
      keyword: 'leave allowance',
      answer:
        'Employees are generally entitled to an annual leave allowance, which is typically 10% of their annual basic salary. This allowance is provided to support employees during their leave period and may vary depending on company policy.',
    },
    {
      keyword: 'gratuity',
      answer:
        'Gratuity is a lump sum payment made to employees upon retirement or completion of a specified period of service. The amount is usually based on the employee’s length of service and final salary, but it largely depends on the company’s policy and employment contract terms.',
    },
    {
      keyword: 'salary advance',
      answer:
        'Some companies offer salary advances, allowing employees to access a portion of their upcoming salary before the regular payday. The advanced amount is typically deducted from the next payroll cycle. Policies regarding salary advances vary by employer.',
    },
    {
      keyword: 'deductions',
      answer:
        'Common deductions from an employee’s salary in Nigeria include PAYE tax, pension contributions (8% by the employee and 10% by the employer), NHF contributions (2.5%), and other company-specific deductions such as cooperative society contributions or loan repayments.',
    },
    {
      keyword: 'thirteenth month',
      answer:
        'The 13th-month salary is not mandated by Nigerian law, but some companies choose to provide it as a bonus, often paid in December. This practice is at the discretion of the employer and is typically outlined in the employment contract or company policy.',
    },
    {
      keyword: 'net vs gross salary',
      answer:
        'Gross salary refers to the total earnings of an employee before any deductions, including basic salary, allowances, and bonuses. Net salary, also known as take-home pay, is the amount an employee receives after all deductions such as taxes and pension contributions have been subtracted.',
    },
    {
      keyword: 'tax clearance',
      answer:
        'A Tax Clearance Certificate (TCC) is issued by the Federal Inland Revenue Service (FIRS) to individuals or companies to certify that they have fulfilled all tax obligations. It is often required for various official transactions and tenders.',
    },
    {
      keyword: 'payroll discrepancies',
      answer:
        'Common payroll discrepancies include incorrect salary payments, miscalculated deductions, and delays in salary disbursement. To resolve these issues, it is important to maintain accurate records, conduct regular payroll audits, and ensure clear communication between the payroll department and employees.',
    },
    {
      keyword: 'payroll taxes',
      answer:
        'Payroll taxes in Nigeria encompass various statutory deductions such as PAYE tax, pension contributions, and NHF contributions. These taxes are mandatory and are deducted at source by the employer before disbursing salaries to employees.',
    },
    {
      keyword: 'taxable income',
      answer:
        'Taxable income is the portion of an employee’s earnings that is subject to tax, after allowable deductions such as pension contributions and NHF have been subtracted from the gross income.',
    },
    {
      keyword: 'tax reliefs',
      answer:
        'In Nigeria, employees are entitled to certain tax reliefs, including Consolidated Relief Allowance (CRA), which reduces the taxable income and thereby the tax payable. The CRA is calculated as ₦200,000 or 1% of gross income, whichever is higher, plus 20% of gross income.',
    },
  ];

  async checkPredefinedAnswers(userMessage: string) {
    const lowerMessage = userMessage.toLowerCase();
    const predefinedAnswer = this.knowledgeBase.find((item) =>
      lowerMessage.includes(item.keyword),
    );

    return predefinedAnswer ? predefinedAnswer.answer : null;
  }

  async chatWithAI(userMessage: string, chatId: string) {
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

    // 🔹 Detect if user is asking for financial data
    if (this.isFinancialQuery(userMessage)) {
      // Fetch payroll/financial data from database
      const userPayrollData = await this.fetchUserPayrollData(chatId);

      if (userPayrollData) {
        extraData = `User Payroll Data:\n${JSON.stringify(userPayrollData, null, 2)}`;
      }
    }

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o', // Use the correct model name
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
        { role: 'system', content: extraData }, // 🔹 Inject database results if found
      ],
      stream: true,
    });

    let fullMessage = '';

    for await (const part of stream) {
      const messageChunk = part.choices[0]?.delta?.content || '';

      if (messageChunk) {
        fullMessage += messageChunk; // Accumulate response chunks
      }
    }

    // Send full response to the frontend after accumulation
    await this.pusherService.triggerEvent(`chat-${chatId}`, 'new-message', {
      message: fullMessage,
    });
  }

  /**
   * Checks if the user message is a financial/payroll-related query.
   */
  isFinancialQuery(message: string): boolean {
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

  /**
   * Fetch user payroll/financial data from the database.
   */
  async fetchUserPayrollData(chatId: string) {
    try {
      // 🔹 Replace with actual DB call (example using Prisma)
      const companyPayslips = this.db
        .select({
          payslip_id: payslips.id,
          payroll_run_id: payroll.payroll_run_id,
          gross_salary: payroll.gross_salary,
          net_salary: payroll.net_salary,
          paye_tax: payroll.paye_tax,
          pension_contribution: payroll.pension_contribution,
          employer_pension_contribution: payroll.employer_pension_contribution,
          nhf_contribution: payroll.nhf_contribution,
          additionalDeductions: payroll.custom_deductions,
          payroll_month: payroll.payroll_month,
          first_name: employees.first_name,
          last_name: employees.last_name,
          status: payroll.approval_status,
          payment_status: payroll.payment_status,
          payment_date: payroll.payment_date,
          taxable_income: payroll.taxable_income,
          payslip_pdf_url: payslips.pdf_url,
          salaryAdvance: payroll.salary_advance,
        })
        .from(payslips)
        .where(eq(employees.company_id, chatId))
        .innerJoin(payroll, eq(payslips.payroll_id, payroll.id))
        .innerJoin(employees, eq(payroll.employee_id, employees.id))
        .execute();

      return companyPayslips;
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      return null;
    }
  }
}
