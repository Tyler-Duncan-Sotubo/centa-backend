"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTaxDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_tax_dto_1 = require("./create-tax.dto");
class UpdateTaxDto extends (0, mapped_types_1.PartialType)(create_tax_dto_1.CreateTaxDto) {
}
exports.UpdateTaxDto = UpdateTaxDto;
//# sourceMappingURL=update-tax.dto.js.map