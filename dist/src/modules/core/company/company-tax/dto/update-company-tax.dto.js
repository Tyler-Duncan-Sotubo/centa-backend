"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCompanyTaxDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_company_tax_dto_1 = require("./create-company-tax.dto");
class UpdateCompanyTaxDto extends (0, mapped_types_1.PartialType)(create_company_tax_dto_1.CreateCompanyTaxDto) {
}
exports.UpdateCompanyTaxDto = UpdateCompanyTaxDto;
//# sourceMappingURL=update-company-tax.dto.js.map