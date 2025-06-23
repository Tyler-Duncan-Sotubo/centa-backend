"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEmployeeDeductionDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_employee_deduction_dto_1 = require("./create-employee-deduction.dto");
class UpdateEmployeeDeductionDto extends (0, mapped_types_1.PartialType)(create_employee_deduction_dto_1.CreateEmployeeDeductionDto) {
}
exports.UpdateEmployeeDeductionDto = UpdateEmployeeDeductionDto;
//# sourceMappingURL=update-employee-deduction.dto.js.map