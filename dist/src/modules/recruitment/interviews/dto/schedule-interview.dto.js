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
exports.ScheduleInterviewDto = void 0;
const class_validator_1 = require("class-validator");
var InterviewStage;
(function (InterviewStage) {
    InterviewStage["PHONE_SCREEN"] = "phone_screen";
    InterviewStage["TECHNICAL"] = "tech";
    InterviewStage["ONSITE"] = "onsite";
    InterviewStage["FINAL"] = "final";
})(InterviewStage || (InterviewStage = {}));
class ScheduleInterviewDto {
}
exports.ScheduleInterviewDto = ScheduleInterviewDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "applicationId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(InterviewStage),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "stage", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "scheduledFor", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ScheduleInterviewDto.prototype, "durationMins", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)(),
    (0, class_validator_1.IsUUID)('all', { each: true }),
    __metadata("design:type", Array)
], ScheduleInterviewDto.prototype, "interviewerIds", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "scorecardTemplateId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "emailTemplateId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "meetingLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "eventId", void 0);
//# sourceMappingURL=schedule-interview.dto.js.map