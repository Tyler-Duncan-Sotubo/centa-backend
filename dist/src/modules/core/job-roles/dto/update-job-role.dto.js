"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateJobRoleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_job_role_dto_1 = require("./create-job-role.dto");
class UpdateJobRoleDto extends (0, mapped_types_1.PartialType)(create_job_role_dto_1.CreateJobRoleDto) {
}
exports.UpdateJobRoleDto = UpdateJobRoleDto;
//# sourceMappingURL=update-job-role.dto.js.map