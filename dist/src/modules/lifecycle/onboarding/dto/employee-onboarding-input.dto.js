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
exports.EmployeeOnboardingInputDto = exports.Currency = exports.MaritalStatus = exports.Gender = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const crypto_util_1 = require("../../../../utils/crypto.util");
var Gender;
(function (Gender) {
    Gender["Male"] = "male";
    Gender["Female"] = "female";
    Gender["Other"] = "other";
})(Gender || (exports.Gender = Gender = {}));
var MaritalStatus;
(function (MaritalStatus) {
    MaritalStatus["Single"] = "single";
    MaritalStatus["Married"] = "married";
    MaritalStatus["Divorced"] = "divorced";
    MaritalStatus["Widowed"] = "widowed";
})(MaritalStatus || (exports.MaritalStatus = MaritalStatus = {}));
var Currency;
(function (Currency) {
    Currency["NGN"] = "NGN";
})(Currency || (exports.Currency = Currency = {}));
class EmployeeOnboardingInputDto {
    constructor() {
        this.currency = 'NGN';
    }
}
exports.EmployeeOnboardingInputDto = EmployeeOnboardingInputDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Gender),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MaritalStatus),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)('NG', { message: 'Invalid Nigerian phone number' }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "emergencyName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)('NG'),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "emergencyPhone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "bankName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "bankAccountNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "bankBranch", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "bankAccountName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Length)(3, 3),
    (0, class_validator_1.IsIn)(['NGN', 'USD', 'EUR', 'GBP', 'KES', 'ZAR']),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "tin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "pensionPin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "nhfNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EmployeeOnboardingInputDto.prototype, "idUpload", void 0);
//# sourceMappingURL=employee-onboarding-input.dto.js.map