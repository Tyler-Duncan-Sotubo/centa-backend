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
let PayrollProcessor = class PayrollProcessor extends bullmq_1.WorkerHost {
    constructor() {
        super();
    }
    async process(job) {
        console.log(`🔄 Processing job: ${job.name}`);
        try {
            switch (job.name) {
                case 'generatePayslips':
                    await this.handleGeneratePayslips(job.data);
                    break;
                default:
                    console.warn(`⚠️ Unhandled job: ${job.name}`);
            }
            console.log(`✅ Job completed: ${job.name}`);
        }
        catch (error) {
            console.error(`❌ Error processing job (${job.name}):`, error);
            throw error;
        }
    }
};
exports.PayrollProcessor = PayrollProcessor;
exports.PayrollProcessor = PayrollProcessor = __decorate([
    (0, bullmq_1.Processor)('payrollQueue'),
    __metadata("design:paramtypes", [])
], PayrollProcessor);
//# sourceMappingURL=organization.processor.js.map