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
exports.CreateQuestionDto = exports.QuestionType = void 0;
const class_validator_1 = require("class-validator");
var QuestionType;
(function (QuestionType) {
    QuestionType["TEXT"] = "text";
    QuestionType["SELECT"] = "select";
    QuestionType["RADIO"] = "radio";
    QuestionType["CHECKBOX"] = "checkbox";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
class CreateQuestionDto {
    constructor() {
        this.required = false;
    }
}
exports.CreateQuestionDto = CreateQuestionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "question", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(QuestionType),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateQuestionDto.prototype, "required", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateQuestionDto.prototype, "options", void 0);
//# sourceMappingURL=create-question.dto.js.map