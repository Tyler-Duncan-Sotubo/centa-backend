"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePayrollOverrideDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_payroll_override_dto_1 = require("./create-payroll-override.dto");
class UpdatePayrollOverrideDto extends (0, mapped_types_1.PartialType)(create_payroll_override_dto_1.CreatePayrollOverrideDto) {
}
exports.UpdatePayrollOverrideDto = UpdatePayrollOverrideDto;
//# sourceMappingURL=update-payroll-override.dto.js.map