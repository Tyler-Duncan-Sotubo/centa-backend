"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEmployeeTaxDetailsDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_employee_tax_details_dto_1 = require("./create-employee-tax-details.dto");
class UpdateEmployeeTaxDetailsDto extends (0, mapped_types_1.PartialType)(create_employee_tax_details_dto_1.CreateEmployeeTaxDetailsDto) {
}
exports.UpdateEmployeeTaxDetailsDto = UpdateEmployeeTaxDetailsDto;
//# sourceMappingURL=update-employee-tax-details.dto.js.map