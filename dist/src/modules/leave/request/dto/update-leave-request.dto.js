"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLeaveRequestDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_leave_request_dto_1 = require("./create-leave-request.dto");
class UpdateLeaveRequestDto extends (0, mapped_types_1.PartialType)(create_leave_request_dto_1.CreateLeaveRequestDto) {
}
exports.UpdateLeaveRequestDto = UpdateLeaveRequestDto;
//# sourceMappingURL=update-leave-request.dto.js.map