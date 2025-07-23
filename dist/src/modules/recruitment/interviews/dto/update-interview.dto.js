"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateInterviewDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_interview_dto_1 = require("./create-interview.dto");
class UpdateInterviewDto extends (0, mapped_types_1.PartialType)(create_interview_dto_1.CreateInterviewDto) {
}
exports.UpdateInterviewDto = UpdateInterviewDto;
//# sourceMappingURL=update-interview.dto.js.map