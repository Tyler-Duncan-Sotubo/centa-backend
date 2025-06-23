"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOnboardingDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_onboarding_dto_1 = require("./create-onboarding.dto");
class UpdateOnboardingDto extends (0, mapped_types_1.PartialType)(create_onboarding_dto_1.CreateOnboardingDto) {
}
exports.UpdateOnboardingDto = UpdateOnboardingDto;
//# sourceMappingURL=update-onboarding.dto.js.map