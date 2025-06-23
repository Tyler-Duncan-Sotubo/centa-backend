"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBenefitPlanDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_benefit_plan_dto_1 = require("./create-benefit-plan.dto");
class UpdateBenefitPlanDto extends (0, mapped_types_1.PartialType)(create_benefit_plan_dto_1.CreateBenefitPlanDto) {
}
exports.UpdateBenefitPlanDto = UpdateBenefitPlanDto;
//# sourceMappingURL=update-benefit-plan.dto.js.map