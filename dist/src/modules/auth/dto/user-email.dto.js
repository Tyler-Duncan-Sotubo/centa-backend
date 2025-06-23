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
exports.PasswordResetDto = exports.UserEmailDto = void 0;
const class_validator_1 = require("class-validator");
class UserEmailDto {
}
exports.UserEmailDto = UserEmailDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UserEmailDto.prototype, "email", void 0);
class PasswordResetDto {
}
exports.PasswordResetDto = PasswordResetDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_1.MinLength)(4),
    __metadata("design:type", String)
], PasswordResetDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_1.IsIn)([Math.random()], {
        message: 'Passwords do not match',
    }),
    (0, class_validator_1.ValidateIf)((o) => o.password !== o.passwordConfirmation),
    __metadata("design:type", String)
], PasswordResetDto.prototype, "passwordConfirmation", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PasswordResetDto.prototype, "token", void 0);
//# sourceMappingURL=user-email.dto.js.map