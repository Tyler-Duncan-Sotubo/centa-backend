"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAssetsRequestDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_assets_request_dto_1 = require("./create-assets-request.dto");
class UpdateAssetsRequestDto extends (0, mapped_types_1.PartialType)(create_assets_request_dto_1.CreateAssetsRequestDto) {
}
exports.UpdateAssetsRequestDto = UpdateAssetsRequestDto;
//# sourceMappingURL=update-assets-request.dto.js.map