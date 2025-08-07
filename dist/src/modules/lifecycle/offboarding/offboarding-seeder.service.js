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
exports.OffboardingSeederService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const termination_types_schema_1 = require("./schema/termination-types.schema");
const termination_reasons_schema_1 = require("./schema/termination-reasons.schema");
const termination_checklist_items_schema_1 = require("./schema/termination-checklist-items.schema");
let OffboardingSeederService = class OffboardingSeederService {
    constructor(db) {
        this.db = db;
    }
    async seedGlobalOffboardingData() {
        await Promise.all([
            this.seedTypes(),
            this.seedReasons(),
            this.seedChecklistItems(),
        ]);
    }
    async seedTypes() {
        const types = [
            {
                name: 'Fired',
                description: 'Employee terminated due to misconduct or violations',
            },
            {
                name: 'Laid Off',
                description: 'Termination due to downsizing or redundancy',
            },
            {
                name: 'Resigned',
                description: 'Voluntary resignation by the employee',
            },
            {
                name: 'Mutual Agreement',
                description: 'Separation agreed upon by both parties',
            },
        ];
        for (const type of types) {
            const exists = await this.db.query.termination_types.findFirst({
                where: (t, { eq }) => eq(t.name, type.name),
            });
            if (!exists) {
                await this.db.insert(termination_types_schema_1.termination_types).values({
                    name: type.name,
                    description: type.description,
                    isGlobal: true,
                    companyId: null,
                });
            }
        }
    }
    async seedReasons() {
        const reasons = [
            {
                name: 'Attendance issues',
                description: 'Chronic lateness or absenteeism',
            },
            {
                name: 'Misconduct',
                description: 'Violation of company policies or ethics',
            },
            {
                name: 'Rudeness to coworker',
                description: 'Inappropriate behavior towards peers',
            },
            {
                name: 'Insubordination',
                description: 'Refusal to follow directions or disrespect to authority',
            },
            {
                name: 'Performance',
                description: 'Failure to meet job expectations or goals',
            },
        ];
        for (const reason of reasons) {
            const exists = await this.db.query.termination_reasons.findFirst({
                where: (r, { eq }) => eq(r.name, reason.name),
            });
            if (!exists) {
                await this.db.insert(termination_reasons_schema_1.termination_reasons).values({
                    name: reason.name,
                    description: reason.description,
                    isGlobal: true,
                    companyId: null,
                });
            }
        }
    }
    async seedChecklistItems() {
        const checklist = [
            {
                name: 'Remove employee from Payroll',
                description: 'Fax termination letter to payroll provider',
                isAssetReturnStep: false,
            },
            {
                name: 'Remove employee from benefits plan',
                description: 'Remove employee from benefit company',
                isAssetReturnStep: false,
            },
            {
                name: 'Calculate vacation payout',
                description: 'Calculate remaining vacation days to payout',
                isAssetReturnStep: false,
            },
            {
                name: 'Disable email address',
                description: 'Make sure IT revoked access to emails',
                isAssetReturnStep: false,
            },
            {
                name: 'Return all company assets',
                description: 'Collect laptop, ID badge, etc.',
                isAssetReturnStep: true,
            },
        ];
        for (const [index, item] of checklist.entries()) {
            const exists = await this.db.query.termination_checklist_items.findFirst({
                where: (i, { eq }) => eq(i.name, item.name),
            });
            if (!exists) {
                await this.db.insert(termination_checklist_items_schema_1.termination_checklist_items).values({
                    name: item.name,
                    description: item.description,
                    isAssetReturnStep: item.isAssetReturnStep,
                    isGlobal: true,
                    companyId: null,
                    order: index + 1,
                    createdAt: new Date(),
                });
            }
        }
    }
};
exports.OffboardingSeederService = OffboardingSeederService;
exports.OffboardingSeederService = OffboardingSeederService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], OffboardingSeederService);
//# sourceMappingURL=offboarding-seeder.service.js.map