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
exports.UpdateFeedbackRuleDto = exports.FeedbackRuleScopeDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class FeedbackRuleScopeDto {
}
exports.FeedbackRuleScopeDto = FeedbackRuleScopeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], FeedbackRuleScopeDto.prototype, "officeOnly", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], FeedbackRuleScopeDto.prototype, "departmentOnly", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], FeedbackRuleScopeDto.prototype, "offices", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], FeedbackRuleScopeDto.prototype, "departments", void 0);
class UpdateFeedbackRuleDto {
}
exports.UpdateFeedbackRuleDto = UpdateFeedbackRuleDto;
__decorate([
    (0, class_validator_1.IsIn)(['employee', 'manager']),
    __metadata("design:type", String)
], UpdateFeedbackRuleDto.prototype, "group", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['self', 'peer', 'manager_to_employee', 'employee_to_manager']),
    __metadata("design:type", String)
], UpdateFeedbackRuleDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateFeedbackRuleDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => FeedbackRuleScopeDto),
    __metadata("design:type", FeedbackRuleScopeDto)
], UpdateFeedbackRuleDto.prototype, "scope", void 0);
//# sourceMappingURL=update-feedback-rule.dto.js.map