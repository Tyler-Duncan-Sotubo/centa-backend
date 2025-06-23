"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateReservedDayDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_reserved_day_dto_1 = require("./create-reserved-day.dto");
class UpdateReservedDayDto extends (0, mapped_types_1.PartialType)(create_reserved_day_dto_1.CreateReservedDayDto) {
}
exports.UpdateReservedDayDto = UpdateReservedDayDto;
//# sourceMappingURL=update-reserved-day.dto.js.map