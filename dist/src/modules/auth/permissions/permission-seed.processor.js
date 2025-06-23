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
exports.PermissionSeedProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const permissions_service_1 = require("./permissions.service");
let PermissionSeedProcessor = class PermissionSeedProcessor extends bullmq_1.WorkerHost {
    constructor(permissionService) {
        super();
        this.permissionService = permissionService;
    }
    async process(job) {
        try {
            switch (job.name) {
                case 'seed-permissions':
                    await this.retryWithLogging(() => this.handleSeedPermissions(job), job.name);
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
                if (i < attempts) {
                    await new Promise((res) => setTimeout(res, delay));
                }
                else {
                    throw err;
                }
            }
        }
    }
    async handleSeedPermissions(job) {
        const { companyId } = job.data;
        try {
            await this.permissionService.seedDefaultPermissionsForCompany(companyId);
        }
        catch (err) {
            console.error(`❌ Error while seeding permissions for ${companyId}:`, err);
            throw err;
        }
    }
};
exports.PermissionSeedProcessor = PermissionSeedProcessor;
exports.PermissionSeedProcessor = PermissionSeedProcessor = __decorate([
    (0, bullmq_1.Processor)('permission-seed-queue'),
    __metadata("design:paramtypes", [permissions_service_1.PermissionsService])
], PermissionSeedProcessor);
//# sourceMappingURL=permission-seed.processor.js.map