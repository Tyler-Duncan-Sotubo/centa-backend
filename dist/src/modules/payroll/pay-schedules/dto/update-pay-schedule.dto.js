"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePayScheduleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_pay_schedule_dto_1 = require("./create-pay-schedule.dto");
class UpdatePayScheduleDto extends (0, mapped_types_1.PartialType)(create_pay_schedule_dto_1.CreatePayScheduleDto) {
}
exports.UpdatePayScheduleDto = UpdatePayScheduleDto;
//# sourceMappingURL=update-pay-schedule.dto.js.map