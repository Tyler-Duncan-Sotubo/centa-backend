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
exports.PayrollProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const payslip_service_1 = require("./services/payslip.service");
const tax_service_1 = require("./services/tax.service");
const pdf_service_1 = require("./services/pdf.service");
const push_notification_service_1 = require("../notification/services/push-notification.service");
let PayrollProcessor = class PayrollProcessor extends bullmq_1.WorkerHost {
    constructor(payslipService, taxService, pdfService, pushNotificationService, queue) {
        super();
        this.payslipService = payslipService;
        this.taxService = taxService;
        this.pdfService = pdfService;
        this.pushNotificationService = pushNotificationService;
        this.queue = queue;
    }
    async process(job) {
        try {
            console.log(`🧾 Processing job: ${job.name}`);
            switch (job.name) {
                case 'generatePayslips':
                    await this.retryWithLogging(() => this.handleGeneratePayslips(job.data), job.name);
                    break;
                case 'populateTaxDetails':
                    await this.retryWithLogging(() => this.handlePopulateTaxDetails(job.data), job.name);
                    break;
                case 'generatePayslipPdf':
                    await this.retryWithLogging(() => this.handleGeneratePayslipPdf(job.data), job.name);
                    break;
                case 'PendingPayroll':
                case 'PayslipGeneratedNotification':
                    await this.retryWithLogging(() => this.sendNotification(job.data), job.name);
                    break;
                default:
                    console.warn(`⚠️ Unhandled job type: ${job.name}`);
            }
        }
        catch (error) {
            console.error(`❌ Final error in job ${job.name}:`, error);
            throw error;
        }
    }
    async retryWithLogging(task, jobName, attempts = 3, delay = 1000) {
        for (let i = 1; i <= attempts; i++) {
            try {
                await task();
                return;
            }
            catch (err) {
                console.warn(`⏱️ Attempt ${i} failed for ${jobName}:`, err);
                if (i < attempts)
                    await new Promise((res) => setTimeout(res, delay));
                else
                    throw err;
            }
        }
    }
    async handleGeneratePayslips(data) {
        const { company_id, payrollMonth } = data;
        await this.payslipService.generatePayslipsForCompany(company_id, payrollMonth);
    }
    async handlePopulateTaxDetails(data) {
        const { company_id, payrollMonth, payrollRunId } = data;
        await this.taxService.onPayrollApproval(company_id, payrollMonth, payrollRunId);
    }
    async handleGeneratePayslipPdf(data) {
        const { payslipId } = data;
        await this.pdfService.generatePayslipPdf(payslipId);
    }
    async sendNotification(data) {
        const { employee_id, message, title, dataMessage } = data;
        await this.pushNotificationService.sendPushNotification(employee_id, message, title, dataMessage);
    }
};
exports.PayrollProcessor = PayrollProcessor;
exports.PayrollProcessor = PayrollProcessor = __decorate([
    (0, bullmq_1.Processor)('payrollQueue'),
    __param(4, (0, bullmq_1.InjectQueue)('payrollQueue')),
    __metadata("design:paramtypes", [payslip_service_1.PayslipService,
        tax_service_1.TaxService,
        pdf_service_1.PdfService,
        push_notification_service_1.PushNotificationService,
        bullmq_2.Queue])
], PayrollProcessor);
//# sourceMappingURL=payroll.processor.js.map