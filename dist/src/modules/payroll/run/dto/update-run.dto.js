"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRunDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_run_dto_1 = require("./create-run.dto");
class UpdateRunDto extends (0, mapped_types_1.PartialType)(create_run_dto_1.CreateRunDto) {
}
exports.UpdateRunDto = UpdateRunDto;
//# sourceMappingURL=update-run.dto.js.map