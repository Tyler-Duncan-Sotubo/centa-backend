"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTerminationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_termination_dto_1 = require("./create-termination.dto");
class UpdateTerminationDto extends (0, mapped_types_1.PartialType)(create_termination_dto_1.CreateTerminationDto) {
}
exports.UpdateTerminationDto = UpdateTerminationDto;
//# sourceMappingURL=update-termination.dto.js.map