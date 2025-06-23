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
exports.EmployeeProfileDto = exports.EmploymentStatus = void 0;
const class_validator_1 = require("class-validator");
var EmploymentStatus;
(function (EmploymentStatus) {
    EmploymentStatus["PROBATION"] = "probation";
    EmploymentStatus["ACTIVE"] = "active";
    EmploymentStatus["ON_LEAVE"] = "on_leave";
    EmploymentStatus["RESIGNED"] = "resigned";
    EmploymentStatus["TERMINATED"] = "terminated";
})(EmploymentStatus || (exports.EmploymentStatus = EmploymentStatus = {}));
class EmployeeProfileDto {
}
exports.EmployeeProfileDto = EmployeeProfileDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "employeeNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "departmentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "locationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "payGroupId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "jobRoleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "companyRoleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "costCenterId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(EmploymentStatus),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "employmentStatus", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "employmentStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EmployeeProfileDto.prototype, "employmentEndDate", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmployeeProfileDto.prototype, "confirmed", void 0);
//# sourceMappingURL=update-employee-details.dto.js.map