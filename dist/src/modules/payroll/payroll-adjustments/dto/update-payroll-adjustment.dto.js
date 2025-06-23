"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePayrollAdjustmentDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_payroll_adjustment_dto_1 = require("./create-payroll-adjustment.dto");
class UpdatePayrollAdjustmentDto extends (0, mapped_types_1.PartialType)(create_payroll_adjustment_dto_1.CreatePayrollAdjustmentDto) {
}
exports.UpdatePayrollAdjustmentDto = UpdatePayrollAdjustmentDto;
//# sourceMappingURL=update-payroll-adjustment.dto.js.map