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
exports.CreateOffCycleDto = void 0;
const class_validator_1 = require("class-validator");
class CreateOffCycleDto {
    constructor() {
        this.taxable = true;
        this.proratable = false;
    }
}
exports.CreateOffCycleDto = CreateOffCycleDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateOffCycleDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOffCycleDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)({}, { message: 'Amount must be a valid decimal string' }),
    __metadata("design:type", String)
], CreateOffCycleDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Payroll date must be a valid ISO date string' }),
    __metadata("design:type", String)
], CreateOffCycleDto.prototype, "payrollDate", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateOffCycleDto.prototype, "taxable", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateOffCycleDto.prototype, "proratable", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateOffCycleDto.prototype, "notes", void 0);
//# sourceMappingURL=create-off-cycle.dto.js.map