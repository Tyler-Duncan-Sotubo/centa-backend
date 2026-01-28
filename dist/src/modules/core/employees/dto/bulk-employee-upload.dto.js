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
exports.BulkEmployeeUploadDto = exports.BulkEmployeeDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const schema_1 = require("../../schema");
const create_finance_dto_1 = require("../finance/dto/create-finance.dto");
const create_compensation_dto_1 = require("../compensation/dto/create-compensation.dto");
class BulkEmployeeDto {
}
exports.BulkEmployeeDto = BulkEmployeeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 50),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "employeeNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "departmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "jobRoleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "payGroupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], BulkEmployeeDto.prototype, "costCenterId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(schema_1.employeeStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], BulkEmployeeDto.prototype, "employmentStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BulkEmployeeDto.prototype, "companyId", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_finance_dto_1.CreateFinanceDto),
    __metadata("design:type", create_finance_dto_1.CreateFinanceDto)
], BulkEmployeeDto.prototype, "finance", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_compensation_dto_1.CreateCompensationDto),
    __metadata("design:type", create_compensation_dto_1.CreateCompensationDto)
], BulkEmployeeDto.prototype, "compensation", void 0);
class BulkEmployeeUploadDto {
}
exports.BulkEmployeeUploadDto = BulkEmployeeUploadDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkEmployeeDto),
    __metadata("design:type", Array)
], BulkEmployeeUploadDto.prototype, "employees", void 0);
//# sourceMappingURL=bulk-employee-upload.dto.js.map