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
exports.CreateFinanceDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const crypto_util_1 = require("../../../../../utils/crypto.util");
class CreateFinanceDto {
    constructor() {
        this.currency = 'NGN';
    }
}
exports.CreateFinanceDto = CreateFinanceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "bankName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "bankAccountNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "bankBranch", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "bankAccountName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Length)(3, 3),
    (0, class_validator_1.IsIn)(['NGN', 'USD', 'EUR', 'GBP', 'KES', 'ZAR']),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "tin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "pensionPin", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value != null ? (0, crypto_util_1.encrypt)(value) : value), {
        toClassOnly: true,
    }),
    __metadata("design:type", String)
], CreateFinanceDto.prototype, "nhfNumber", void 0);
//# sourceMappingURL=create-finance.dto.js.map