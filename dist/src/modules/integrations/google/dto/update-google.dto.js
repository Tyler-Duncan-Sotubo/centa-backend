"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGoogleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_google_dto_1 = require("./create-google.dto");
class UpdateGoogleDto extends (0, mapped_types_1.PartialType)(create_google_dto_1.CreateGoogleDto) {
}
exports.UpdateGoogleDto = UpdateGoogleDto;
//# sourceMappingURL=update-google.dto.js.map