"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEmployeeShiftDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_employee_shift_dto_1 = require("./create-employee-shift.dto");
class UpdateEmployeeShiftDto extends (0, mapped_types_1.PartialType)(create_employee_shift_dto_1.CreateEmployeeShiftDto) {
}
exports.UpdateEmployeeShiftDto = UpdateEmployeeShiftDto;
//# sourceMappingURL=update-employee-shift.dto.js.map