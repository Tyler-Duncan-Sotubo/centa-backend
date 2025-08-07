"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOffboardingConfigDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_offboarding_config_dto_1 = require("./create-offboarding-config.dto");
class UpdateOffboardingConfigDto extends (0, mapped_types_1.PartialType)(create_offboarding_config_dto_1.CreateOffboardingConfigDto) {
}
exports.UpdateOffboardingConfigDto = UpdateOffboardingConfigDto;
//# sourceMappingURL=update-offboarding-config.dto.js.map