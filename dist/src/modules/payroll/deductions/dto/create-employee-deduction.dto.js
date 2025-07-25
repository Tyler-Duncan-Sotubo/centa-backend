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
exports.CreateEmployeeDeductionDto = exports.RateType = void 0;
const class_validator_1 = require("class-validator");
var RateType;
(function (RateType) {
    RateType["FIXED"] = "fixed";
    RateType["PERCENTAGE"] = "percentage";
})(RateType || (exports.RateType = RateType = {}));
class CreateEmployeeDeductionDto {
    constructor() {
        this.isActive = true;
    }
}
exports.CreateEmployeeDeductionDto = CreateEmployeeDeductionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEmployeeDeductionDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEmployeeDeductionDto.prototype, "deductionTypeId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RateType),
    __metadata("design:type", String)
], CreateEmployeeDeductionDto.prototype, "rateType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDeductionDto.prototype, "rateValue", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeDeductionDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeDeductionDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateEmployeeDeductionDto.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEmployeeDeductionDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-employee-deduction.dto.js.map