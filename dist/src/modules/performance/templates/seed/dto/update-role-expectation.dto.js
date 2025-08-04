"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRoleExpectationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_role_expectation_dto_1 = require("./create-role-expectation.dto");
class UpdateRoleExpectationDto extends (0, mapped_types_1.PartialType)(create_role_expectation_dto_1.CreateRoleExpectationDto) {
}
exports.UpdateRoleExpectationDto = UpdateRoleExpectationDto;
//# sourceMappingURL=update-role-expectation.dto.js.map