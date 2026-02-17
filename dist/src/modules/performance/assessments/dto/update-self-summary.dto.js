"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSelfSummaryDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_self_summary_dto_1 = require("./create-self-summary.dto");
class UpdateSelfSummaryDto extends (0, mapped_types_1.PartialType)(create_self_summary_dto_1.CreateSelfSummaryDto) {
}
exports.UpdateSelfSummaryDto = UpdateSelfSummaryDto;
//# sourceMappingURL=update-self-summary.dto.js.map