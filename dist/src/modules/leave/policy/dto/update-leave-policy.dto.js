"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLeavePolicyDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_leave_policy_dto_1 = require("./create-leave-policy.dto");
class UpdateLeavePolicyDto extends (0, mapped_types_1.PartialType)(create_leave_policy_dto_1.CreateLeavePolicyDto) {
}
exports.UpdateLeavePolicyDto = UpdateLeavePolicyDto;
//# sourceMappingURL=update-leave-policy.dto.js.map