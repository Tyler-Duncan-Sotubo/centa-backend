"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePipelineDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_pipeline_dto_1 = require("./create-pipeline.dto");
class UpdatePipelineDto extends (0, mapped_types_1.PartialType)(create_pipeline_dto_1.CreatePipelineDto) {
}
exports.UpdatePipelineDto = UpdatePipelineDto;
//# sourceMappingURL=update-pipeline.dto.js.map