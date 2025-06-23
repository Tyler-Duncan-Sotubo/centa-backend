"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOffCycleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_off_cycle_dto_1 = require("./create-off-cycle.dto");
class UpdateOffCycleDto extends (0, mapped_types_1.PartialType)(create_off_cycle_dto_1.CreateOffCycleDto) {
}
exports.UpdateOffCycleDto = UpdateOffCycleDto;
//# sourceMappingURL=update-off-cycle.dto.js.map