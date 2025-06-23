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
exports.CreateEmployeeMultiDetailsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const crypto_util_1 = require("../../../../utils/crypto.util");
class CreateEmployeeMultiDetailsDto {
}
exports.CreateEmployeeMultiDetailsDto = CreateEmployeeMultiDetailsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "companyRoleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "employeeNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "departmentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "locationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "payGroupId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "jobRoleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "costCenterId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['probation', 'active', 'on_leave', 'resigned', 'terminated']),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "employmentStatus", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "employmentStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "probationEndDate", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEmployeeMultiDetailsDto.prototype, "confirmed", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['male', 'female', 'other']),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['single', 'married', 'divorced']),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "emergencyName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "emergencyPhone", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => Number(value)),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateEmployeeMultiDetailsDto.prototype, "grossSalary", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 3),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['Monthly', 'Biweekly', 'Weekly']),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "payFrequency", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEmployeeMultiDetailsDto.prototype, "applyNHf", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "relationship", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "dependentDob", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEmployeeMultiDetailsDto.prototype, "isBeneficiary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ obj }) => String(obj.employmentDate)),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "effectiveDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "bankName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "bankAccountNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "bankBranch", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "bankAccountName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "tin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "pensionPin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateEmployeeMultiDetailsDto.prototype, "nhfNumber", void 0);
//# sourceMappingURL=create-employee-multi-details.dto.js.map