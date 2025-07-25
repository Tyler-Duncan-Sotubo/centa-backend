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
exports.CreateBenefitPlanDto = exports.BenefitSplit = exports.BenefitCategory = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var BenefitCategory;
(function (BenefitCategory) {
    BenefitCategory["Health"] = "Health";
    BenefitCategory["Dental"] = "Dental";
    BenefitCategory["Wellness"] = "Wellness";
    BenefitCategory["Perks"] = "Perks";
    BenefitCategory["LifeInsurance"] = "Life Insurance";
    BenefitCategory["DisabilityInsurance"] = "Disability Insurance";
    BenefitCategory["RetirementPlans"] = "Retirement Plans";
    BenefitCategory["CommuterBenefits"] = "Commuter Benefits";
    BenefitCategory["Reimbursement"] = "Reimbursement";
})(BenefitCategory || (exports.BenefitCategory = BenefitCategory = {}));
var BenefitSplit;
(function (BenefitSplit) {
    BenefitSplit["EMPLOYEE"] = "employee";
    BenefitSplit["EMPLOYER"] = "employer";
    BenefitSplit["SHARED"] = "shared";
})(BenefitSplit || (exports.BenefitSplit = BenefitSplit = {}));
class CreateBenefitPlanDto {
}
exports.CreateBenefitPlanDto = CreateBenefitPlanDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBenefitPlanDto.prototype, "benefitGroupId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBenefitPlanDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBenefitPlanDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BenefitCategory),
    __metadata("design:type", String)
], CreateBenefitPlanDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateBenefitPlanDto.prototype, "coverageOptions", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateBenefitPlanDto.prototype, "cost", void 0);
__decorate([
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateBenefitPlanDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateBenefitPlanDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BenefitSplit),
    __metadata("design:type", String)
], CreateBenefitPlanDto.prototype, "split", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBenefitPlanDto.prototype, "employerContribution", void 0);
//# sourceMappingURL=create-benefit-plan.dto.js.map