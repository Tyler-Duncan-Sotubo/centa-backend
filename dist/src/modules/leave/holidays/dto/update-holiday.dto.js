"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateHolidayDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_holiday_dto_1 = require("./create-holiday.dto");
class UpdateHolidayDto extends (0, mapped_types_1.PartialType)(create_holiday_dto_1.CreateHolidayDto) {
}
exports.UpdateHolidayDto = UpdateHolidayDto;
//# sourceMappingURL=update-holiday.dto.js.map