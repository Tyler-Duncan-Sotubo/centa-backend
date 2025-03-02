"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCompanyContactDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_company_contact_dto_1 = require("./create-company-contact.dto");
class UpdateCompanyContactDto extends (0, mapped_types_1.PartialType)(create_company_contact_dto_1.CreateCompanyContactDto) {
}
exports.UpdateCompanyContactDto = UpdateCompanyContactDto;
//# sourceMappingURL=update-company-contact.dto.js.map