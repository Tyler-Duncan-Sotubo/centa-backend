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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const payslip_service_1 = require("./services/payslip.service");
const tax_service_1 = require("./services/tax.service");
const pdf_service_1 = require("./services/pdf.service");
const push_notification_service_1 = require("../notification/services/push-notification.service");
let PayrollProcessor = class PayrollProcessor extends bullmq_1.WorkerHost {
    constructor(payslipService, taxService, pdfService, pushNotificationService) {
        super();
        this.payslipService = payslipService;
        this.taxService = taxService;
        this.pdfService = pdfService;
        this.pushNotificationService = pushNotificationService;
    }
    async process(job) {
        try {
            switch (job.name) {
                case 'generatePayslips':
                    await this.handleGeneratePayslips(job.data);
                    break;
                case 'populateTaxDetails':
                    await this.handlePopulateTaxDetails(job.data);
                    break;
                case 'generatePayslipPdf':
                    await this.handleGeneratePayslipPdf(job.data);
                    break;
                case 'PendingPayroll':
                    await this.handleSendNotification(job.data);
                    break;
                case 'PayslipGenerated':
                    await this.handlePayslipSendNotification(job.data);
                    break;
                default:
                    console.warn(`⚠️ Unhandled job: ${job.name}`);
            }
        }
        catch (error) {
            console.error(`❌ Error processing job (${job.name}):`, error);
            throw error;
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
    async handleSendNotification(data) {
        const { employee_id, message, title, dataMessage } = data;
        await this.pushNotificationService.sendPushNotification(employee_id, message, title, dataMessage);
    }
    async handlePayslipSendNotification(data) {
        const { employee_id, message, title, dataMessage } = data;
        await this.pushNotificationService.sendPushNotification(employee_id, message, title, dataMessage);
    }
};
exports.PayrollProcessor = PayrollProcessor;
exports.PayrollProcessor = PayrollProcessor = __decorate([
    (0, bullmq_1.Processor)('payrollQueue'),
    __metadata("design:paramtypes", [payslip_service_1.PayslipService,
        tax_service_1.TaxService,
        pdf_service_1.PdfService,
        push_notification_service_1.PushNotificationService])
], PayrollProcessor);
//# sourceMappingURL=payroll.processor.js.map