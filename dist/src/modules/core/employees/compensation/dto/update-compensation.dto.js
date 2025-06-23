"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCompensationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_compensation_dto_1 = require("./create-compensation.dto");
class UpdateCompensationDto extends (0, mapped_types_1.PartialType)(create_compensation_dto_1.CreateCompensationDto) {
}
exports.UpdateCompensationDto = UpdateCompensationDto;
//# sourceMappingURL=update-compensation.dto.js.map