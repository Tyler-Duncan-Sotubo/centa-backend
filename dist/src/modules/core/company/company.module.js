"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModule = void 0;
const common_1 = require("@nestjs/common");
const company_service_1 = require("./company.service");
const company_controller_1 = require("./company.controller");
const locations_module_1 = require("./locations/locations.module");
const company_tax_module_1 = require("./company-tax/company-tax.module");
const seeder_service_1 = require("../../lifecycle/onboarding/seeder.service");
const documents_module_1 = require("./documents/documents.module");
let CompanyModule = class CompanyModule {
};
exports.CompanyModule = CompanyModule;
exports.CompanyModule = CompanyModule = __decorate([
    (0, common_1.Module)({
        controllers: [company_controller_1.CompanyController],
        providers: [company_service_1.CompanyService, seeder_service_1.OnboardingSeederService],
        imports: [locations_module_1.LocationsModule, company_tax_module_1.CompanyTaxModule, documents_module_1.DocumentsModule],
        exports: [company_service_1.CompanyService, locations_module_1.LocationsModule],
    })
], CompanyModule);
//# sourceMappingURL=company.module.js.map