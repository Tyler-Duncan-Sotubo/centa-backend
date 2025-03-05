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
let PayrollProcessor = class PayrollProcessor extends bullmq_1.WorkerHost {
    constructor(payslipService, taxService, pdfService) {
        super();
        this.payslipService = payslipService;
        this.taxService = taxService;
        this.pdfService = pdfService;
    }
    async process(job) {
        const { name, data } = job;
        try {
            if (name === 'generatePayslips') {
                const { company_id, payrollMonth } = data;
                await this.payslipService.generatePayslipsForCompany(company_id, payrollMonth);
            }
            else if (name === 'populateTaxDetails') {
                const { company_id, payrollMonth, payrollRunId } = data;
                await this.taxService.onPayrollApproval(company_id, payrollMonth, payrollRunId);
            }
            else if (name === 'generatePayslipPdf') {
                const { payslipId } = data;
                await this.pdfService.generatePayslipPdf(payslipId);
            }
            else {
                console.warn(`Unhandled job name: ${name}`);
            }
        }
        catch (error) {
            console.error(`Failed to process job (${name}): ${error.message}`);
            throw error;
        }
    }
};
exports.PayrollProcessor = PayrollProcessor;
exports.PayrollProcessor = PayrollProcessor = __decorate([
    (0, bullmq_1.Processor)('payrollQueue'),
    __metadata("design:paramtypes", [payslip_service_1.PayslipService,
        tax_service_1.TaxService,
        pdf_service_1.PdfService])
], PayrollProcessor);
//# sourceMappingURL=payroll.processor.js.map