"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePayslipDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_payslip_dto_1 = require("./create-payslip.dto");
class UpdatePayslipDto extends (0, mapped_types_1.PartialType)(create_payslip_dto_1.CreatePayslipDto) {
}
exports.UpdatePayslipDto = UpdatePayslipDto;
//# sourceMappingURL=update-payslip.dto.js.map