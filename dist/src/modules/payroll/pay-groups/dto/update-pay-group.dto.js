"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePayGroupDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_pay_group_dto_1 = require("./create-pay-group.dto");
class UpdatePayGroupDto extends (0, mapped_types_1.PartialType)(create_pay_group_dto_1.CreatePayGroupDto) {
}
exports.UpdatePayGroupDto = UpdatePayGroupDto;
//# sourceMappingURL=update-pay-group.dto.js.map