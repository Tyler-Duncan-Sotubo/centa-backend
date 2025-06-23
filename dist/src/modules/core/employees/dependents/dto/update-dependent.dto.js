"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDependentDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_dependent_dto_1 = require("./create-dependent.dto");
class UpdateDependentDto extends (0, mapped_types_1.PartialType)(create_dependent_dto_1.CreateDependentDto) {
}
exports.UpdateDependentDto = UpdateDependentDto;
//# sourceMappingURL=update-dependent.dto.js.map