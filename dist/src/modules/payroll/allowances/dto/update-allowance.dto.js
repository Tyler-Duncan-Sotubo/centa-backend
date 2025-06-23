"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAllowanceDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_allowance_dto_1 = require("./create-allowance.dto");
class UpdateAllowanceDto extends (0, mapped_types_1.PartialType)(create_allowance_dto_1.CreateAllowanceDto) {
}
exports.UpdateAllowanceDto = UpdateAllowanceDto;
//# sourceMappingURL=update-allowance.dto.js.map