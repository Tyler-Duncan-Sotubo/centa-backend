"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateFeedbackQuestionDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_feedback_question_dto_1 = require("./create-feedback-question.dto");
class UpdateFeedbackQuestionDto extends (0, mapped_types_1.PartialType)(create_feedback_question_dto_1.CreateFeedbackQuestionDto) {
}
exports.UpdateFeedbackQuestionDto = UpdateFeedbackQuestionDto;
//# sourceMappingURL=update-feedback-question.dto.js.map