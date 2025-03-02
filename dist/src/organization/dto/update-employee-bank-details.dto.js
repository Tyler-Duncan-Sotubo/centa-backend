"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEmployeeBankDetailsDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_employee_bank_details_dto_1 = require("./create-employee-bank-details.dto");
class UpdateEmployeeBankDetailsDto extends (0, mapped_types_1.PartialType)(create_employee_bank_details_dto_1.CreateEmployeeBankDetailsDto) {
}
exports.UpdateEmployeeBankDetailsDto = UpdateEmployeeBankDetailsDto;
//# sourceMappingURL=update-employee-bank-details.dto.js.map