"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateChecklistDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_checklist_dto_1 = require("./create-checklist.dto");
class UpdateChecklistDto extends (0, mapped_types_1.PartialType)(create_checklist_dto_1.CreateChecklistDto) {
}
exports.UpdateChecklistDto = UpdateChecklistDto;
//# sourceMappingURL=update-checklist.dto.js.map