"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentsModule = void 0;
const common_1 = require("@nestjs/common");
const assessments_service_1 = require("./assessments.service");
const assessments_controller_1 = require("./assessments.controller");
const clock_in_out_service_1 = require("../../time/clock-in-out/clock-in-out.service");
const assessment_responses_controller_1 = require("./responses/assessment-responses.controller");
const assessment_conclusions_controller_1 = require("./conclusions/assessment-conclusions.controller");
const responses_service_1 = require("./responses/responses.service");
const conclusions_service_1 = require("./conclusions/conclusions.service");
let AssessmentsModule = class AssessmentsModule {
};
exports.AssessmentsModule = AssessmentsModule;
exports.AssessmentsModule = AssessmentsModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            assessments_controller_1.AssessmentsController,
            assessment_responses_controller_1.AssessmentResponsesController,
            assessment_conclusions_controller_1.AssessmentConclusionsController,
        ],
        providers: [
            assessments_service_1.AssessmentsService,
            clock_in_out_service_1.ClockInOutService,
            responses_service_1.AssessmentResponsesService,
            conclusions_service_1.AssessmentConclusionsService,
        ],
    })
], AssessmentsModule);
//# sourceMappingURL=assessments.module.js.map