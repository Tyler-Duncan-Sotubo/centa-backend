"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBlockedDayDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_blocked_day_dto_1 = require("./create-blocked-day.dto");
class UpdateBlockedDayDto extends (0, mapped_types_1.PartialType)(create_blocked_day_dto_1.CreateBlockedDayDto) {
}
exports.UpdateBlockedDayDto = UpdateBlockedDayDto;
//# sourceMappingURL=update-blocked-day.dto.js.map