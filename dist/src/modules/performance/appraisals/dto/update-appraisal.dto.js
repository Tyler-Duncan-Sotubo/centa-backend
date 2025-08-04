"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAppraisalDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_appraisal_dto_1 = require("./create-appraisal.dto");
class UpdateAppraisalDto extends (0, mapped_types_1.PartialType)(create_appraisal_dto_1.CreateAppraisalDto) {
}
exports.UpdateAppraisalDto = UpdateAppraisalDto;
//# sourceMappingURL=update-appraisal.dto.js.map