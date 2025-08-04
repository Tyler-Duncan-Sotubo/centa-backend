"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCycleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_cycle_dto_1 = require("./create-cycle.dto");
class UpdateCycleDto extends (0, mapped_types_1.PartialType)(create_cycle_dto_1.CreateCycleDto) {
}
exports.UpdateCycleDto = UpdateCycleDto;
//# sourceMappingURL=update-cycle.dto.js.map