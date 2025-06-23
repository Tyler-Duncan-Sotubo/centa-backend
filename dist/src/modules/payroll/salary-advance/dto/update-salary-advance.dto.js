"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSalaryAdvanceDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_salary_advance_dto_1 = require("./create-salary-advance.dto");
class UpdateSalaryAdvanceDto extends (0, mapped_types_1.PartialType)(create_salary_advance_dto_1.CreateSalaryAdvanceDto) {
}
exports.UpdateSalaryAdvanceDto = UpdateSalaryAdvanceDto;
//# sourceMappingURL=update-salary-advance.dto.js.map