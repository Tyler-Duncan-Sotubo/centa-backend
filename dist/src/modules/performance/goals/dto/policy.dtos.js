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
exports.UpsertTeamPolicyDto = exports.UpsertCompanyPolicyDto = exports.CADENCE_VALUES = exports.VISIBILITY_VALUES = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.VISIBILITY_VALUES = ['private', 'manager', 'company'];
exports.CADENCE_VALUES = ['weekly', 'biweekly', 'monthly'];
class UpsertCompanyPolicyDto {
}
exports.UpsertCompanyPolicyDto = UpsertCompanyPolicyDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.VISIBILITY_VALUES, {
        message: `defaultVisibility must be one of: ${exports.VISIBILITY_VALUES.join(', ')}`,
    }),
    __metadata("design:type", String)
], UpsertCompanyPolicyDto.prototype, "defaultVisibility", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.CADENCE_VALUES, {
        message: `defaultCadence must be one of: ${exports.CADENCE_VALUES.join(', ')}`,
    }),
    __metadata("design:type", String)
], UpsertCompanyPolicyDto.prototype, "defaultCadence", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertCompanyPolicyDto.prototype, "defaultTimezone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], UpsertCompanyPolicyDto.prototype, "defaultAnchorDow", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Number)
], UpsertCompanyPolicyDto.prototype, "defaultAnchorHour", void 0);
class UpsertTeamPolicyDto {
}
exports.UpsertTeamPolicyDto = UpsertTeamPolicyDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.VISIBILITY_VALUES, {
        message: `visibility must be one of: ${exports.VISIBILITY_VALUES.join(', ')}`,
    }),
    __metadata("design:type", String)
], UpsertTeamPolicyDto.prototype, "visibility", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.CADENCE_VALUES, {
        message: `cadence must be one of: ${exports.CADENCE_VALUES.join(', ')}`,
    }),
    __metadata("design:type", String)
], UpsertTeamPolicyDto.prototype, "cadence", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertTeamPolicyDto.prototype, "timezone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], UpsertTeamPolicyDto.prototype, "anchorDow", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Number)
], UpsertTeamPolicyDto.prototype, "anchorHour", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertTeamPolicyDto.prototype, "defaultOwnerIsLead", void 0);
//# sourceMappingURL=policy.dtos.js.map