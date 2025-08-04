"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateQuestionsDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_questions_dto_1 = require("./create-questions.dto");
class UpdateQuestionsDto extends (0, mapped_types_1.PartialType)(create_questions_dto_1.CreateQuestionsDto) {
}
exports.UpdateQuestionsDto = UpdateQuestionsDto;
//# sourceMappingURL=update-questions.dto.js.map