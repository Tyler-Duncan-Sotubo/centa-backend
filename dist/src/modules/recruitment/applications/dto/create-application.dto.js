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
exports.CreateApplicationDto = exports.ApplicationSource = exports.QuestionResponseDto = exports.FieldResponseDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class FieldResponseDto {
}
exports.FieldResponseDto = FieldResponseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FieldResponseDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FieldResponseDto.prototype, "fieldType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FieldResponseDto.prototype, "value", void 0);
class QuestionResponseDto {
}
exports.QuestionResponseDto = QuestionResponseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QuestionResponseDto.prototype, "question", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QuestionResponseDto.prototype, "answer", void 0);
var CandidateSource;
(function (CandidateSource) {
    CandidateSource["CAREER_PAGE"] = "career_page";
    CandidateSource["JOB_BOARD"] = "job_board";
    CandidateSource["REFERRAL"] = "referral";
    CandidateSource["AGENCY"] = "agency";
    CandidateSource["HEADHUNTER"] = "headhunter";
    CandidateSource["OTHER"] = "other";
})(CandidateSource || (CandidateSource = {}));
var ApplicationSource;
(function (ApplicationSource) {
    ApplicationSource["CAREER_PAGE"] = "career_page";
    ApplicationSource["LINKEDIN"] = "linkedin";
    ApplicationSource["INDEED"] = "indeed";
    ApplicationSource["REFERRAL"] = "referral";
    ApplicationSource["AGENCY"] = "agency";
    ApplicationSource["INTERNAL"] = "internal";
    ApplicationSource["OTHER"] = "other";
})(ApplicationSource || (exports.ApplicationSource = ApplicationSource = {}));
class CreateApplicationDto {
}
exports.CreateApplicationDto = CreateApplicationDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateApplicationDto.prototype, "jobId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ApplicationSource),
    __metadata("design:type", String)
], CreateApplicationDto.prototype, "applicationSource", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CandidateSource),
    __metadata("design:type", String)
], CreateApplicationDto.prototype, "candidateSource", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FieldResponseDto),
    __metadata("design:type", Array)
], CreateApplicationDto.prototype, "fieldResponses", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => QuestionResponseDto),
    __metadata("design:type", Array)
], CreateApplicationDto.prototype, "questionResponses", void 0);
//# sourceMappingURL=create-application.dto.js.map