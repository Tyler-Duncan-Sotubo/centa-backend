"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOffboardingDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_offboarding_dto_1 = require("./create-offboarding.dto");
class UpdateOffboardingDto extends (0, mapped_types_1.PartialType)(create_offboarding_dto_1.CreateOffboardingBeginDto) {
}
exports.UpdateOffboardingDto = UpdateOffboardingDto;
//# sourceMappingURL=update-offboarding.dto.js.map