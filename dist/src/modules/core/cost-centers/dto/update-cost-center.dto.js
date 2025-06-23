"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCostCenterDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_cost_center_dto_1 = require("./create-cost-center.dto");
class UpdateCostCenterDto extends (0, mapped_types_1.PartialType)(create_cost_center_dto_1.CreateCostCenterDto) {
}
exports.UpdateCostCenterDto = UpdateCostCenterDto;
//# sourceMappingURL=update-cost-center.dto.js.map