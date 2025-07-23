"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOfferTemplateDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_offer_template_dto_1 = require("./create-offer-template.dto");
class UpdateOfferTemplateDto extends (0, mapped_types_1.PartialType)(create_offer_template_dto_1.CreateOfferTemplateDto) {
}
exports.UpdateOfferTemplateDto = UpdateOfferTemplateDto;
//# sourceMappingURL=update-offer-template.dto.js.map