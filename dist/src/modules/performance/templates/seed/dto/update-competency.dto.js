"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCompetencyDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_competency_dto_1 = require("./create-competency.dto");
class UpdateCompetencyDto extends (0, mapped_types_1.PartialType)(create_competency_dto_1.CreateCompetencyDto) {
}
exports.UpdateCompetencyDto = UpdateCompetencyDto;
//# sourceMappingURL=update-competency.dto.js.map