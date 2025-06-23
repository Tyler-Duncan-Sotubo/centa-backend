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
exports.CreateOnboardingTemplateDto = exports.OnboardingTemplateFieldDto = exports.OnboardingTemplateChecklistDto = exports.FieldTag = void 0;
const class_validator_1 = require("class-validator");
var FieldTag;
(function (FieldTag) {
    FieldTag["PROFILE"] = "profile";
    FieldTag["FINANCE"] = "finance";
    FieldTag["EDUCATION"] = "education";
    FieldTag["DEPENDENTS"] = "dependents";
    FieldTag["DOCUMENT"] = "document";
    FieldTag["OTHER"] = "other";
})(FieldTag || (exports.FieldTag = FieldTag = {}));
class OnboardingTemplateChecklistDto {
}
exports.OnboardingTemplateChecklistDto = OnboardingTemplateChecklistDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], OnboardingTemplateChecklistDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['employee', 'hr']),
    __metadata("design:type", String)
], OnboardingTemplateChecklistDto.prototype, "assignee", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], OnboardingTemplateChecklistDto.prototype, "dueDaysAfterStart", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], OnboardingTemplateChecklistDto.prototype, "order", void 0);
class OnboardingTemplateFieldDto {
}
exports.OnboardingTemplateFieldDto = OnboardingTemplateFieldDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], OnboardingTemplateFieldDto.prototype, "fieldKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], OnboardingTemplateFieldDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], OnboardingTemplateFieldDto.prototype, "fieldType", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], OnboardingTemplateFieldDto.prototype, "required", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], OnboardingTemplateFieldDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(Object.values(FieldTag)),
    __metadata("design:type", String)
], OnboardingTemplateFieldDto.prototype, "tag", void 0);
class CreateOnboardingTemplateDto {
}
exports.CreateOnboardingTemplateDto = CreateOnboardingTemplateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOnboardingTemplateDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingTemplateDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateOnboardingTemplateDto.prototype, "fields", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateOnboardingTemplateDto.prototype, "checklist", void 0);
//# sourceMappingURL=create-onboarding-template.dto.js.map