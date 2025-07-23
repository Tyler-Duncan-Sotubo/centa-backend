"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFieldDto = exports.FieldType = void 0;
const class_validator_1 = require("class-validator");
var FieldType;
(function (FieldType) {
    FieldType["TEXT"] = "text";
    FieldType["TEXTAREA"] = "textarea";
    FieldType["FILE"] = "file";
    FieldType["DATE"] = "date";
    FieldType["SELECT"] = "select";
})(FieldType || (exports.FieldType = FieldType = {}));
class CreateFieldDto {
    constructor() {
        this.required = false;
        this.isVisible = true;
        this.isEditable = true;
    }
}
exports.CreateFieldDto = CreateFieldDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFieldDto.prototype, "section", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFieldDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(FieldType),
    __metadata("design:type", String)
], CreateFieldDto.prototype, "fieldType", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateFieldDto.prototype, "required", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateFieldDto.prototype, "isVisible", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateFieldDto.prototype, "isEditable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateFieldDto.prototype, "order", void 0);
//# sourceMappingURL=create-field.dto.js.map