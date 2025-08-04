"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAssessmentDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_assessment_dto_1 = require("./create-assessment.dto");
class UpdateAssessmentDto extends (0, mapped_types_1.PartialType)(create_assessment_dto_1.CreateAssessmentDto) {
}
exports.UpdateAssessmentDto = UpdateAssessmentDto;
//# sourceMappingURL=update-assessment.dto.js.map