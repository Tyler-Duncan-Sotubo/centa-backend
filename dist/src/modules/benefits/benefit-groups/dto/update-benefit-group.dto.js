"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBenefitGroupDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_benefit_group_dto_1 = require("./create-benefit-group.dto");
class UpdateBenefitGroupDto extends (0, mapped_types_1.PartialType)(create_benefit_group_dto_1.CreateBenefitGroupDto) {
}
exports.UpdateBenefitGroupDto = UpdateBenefitGroupDto;
//# sourceMappingURL=update-benefit-group.dto.js.map