"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBonusDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_bonus_dto_1 = require("./create-bonus.dto");
class UpdateBonusDto extends (0, mapped_types_1.PartialType)(create_bonus_dto_1.CreateBonusDto) {
}
exports.UpdateBonusDto = UpdateBonusDto;
//# sourceMappingURL=update-bonus.dto.js.map