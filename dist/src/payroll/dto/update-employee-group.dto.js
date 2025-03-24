"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEmployeeGroupDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_employee_group_dto_1 = require("./create-employee-group.dto");
class UpdateEmployeeGroupDto extends (0, mapped_types_1.PartialType)(create_employee_group_dto_1.CreateEmployeeGroupDto) {
}
exports.UpdateEmployeeGroupDto = UpdateEmployeeGroupDto;
//# sourceMappingURL=update-employee-group.dto.js.map