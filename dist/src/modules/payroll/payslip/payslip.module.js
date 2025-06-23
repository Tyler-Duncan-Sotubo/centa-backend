"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayslipModule = void 0;
const common_1 = require("@nestjs/common");
const payslip_service_1 = require("./payslip.service");
const payslip_controller_1 = require("./payslip.controller");
const aws_service_1 = require("../../../common/aws/aws.service");
const bullmq_1 = require("@nestjs/bullmq");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
let PayslipModule = class PayslipModule {
};
exports.PayslipModule = PayslipModule;
exports.PayslipModule = PayslipModule = __decorate([
    (0, common_1.Module)({
        controllers: [payslip_controller_1.PayslipController],
        providers: [payslip_service_1.PayslipService, aws_service_1.AwsService, s3_storage_service_1.S3StorageService],
        exports: [payslip_service_1.PayslipService],
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'payrollQueue',
            }),
        ],
    })
], PayslipModule);
//# sourceMappingURL=payslip.module.js.map