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
exports.AddKrCheckinDto = exports.CheckinValueOrPct = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let CheckinValueOrPct = class CheckinValueOrPct {
    validate(obj) {
        const hasValue = obj?.value !== undefined && obj?.value !== null && obj?.value !== '';
        const hasPct = obj?.progressPct !== undefined &&
            obj?.progressPct !== null &&
            obj?.progressPct !== '';
        return hasValue || hasPct;
    }
    defaultMessage() {
        return 'Provide either "value" (for metric KRs) or "progressPct" (for milestone/binary KRs).';
    }
};
exports.CheckinValueOrPct = CheckinValueOrPct;
exports.CheckinValueOrPct = CheckinValueOrPct = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'CheckinValueOrPct', async: false })
], CheckinValueOrPct);
class AddKrCheckinDto {
}
exports.AddKrCheckinDto = AddKrCheckinDto;
__decorate([
    (0, class_validator_1.Validate)(CheckinValueOrPct, {
        message: 'Provide either "value" (for metric KRs) or "progressPct" (for milestone/binary KRs).',
    }),
    __metadata("design:type", Object)
], AddKrCheckinDto.prototype, "dummyProperty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({ allowNaN: false }, { message: 'value must be a number' }),
    __metadata("design:type", Object)
], AddKrCheckinDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'progressPct must be a number' }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], AddKrCheckinDto.prototype, "progressPct", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", Object)
], AddKrCheckinDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AddKrCheckinDto.prototype, "allowRegression", void 0);
//# sourceMappingURL=add-kr-checkin.dto.js.map