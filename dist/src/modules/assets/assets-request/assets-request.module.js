"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsRequestModule = void 0;
const common_1 = require("@nestjs/common");
const assets_request_service_1 = require("./assets-request.service");
const assets_request_controller_1 = require("./assets-request.controller");
const assets_settings_service_1 = require("../settings/assets-settings.service");
let AssetsRequestModule = class AssetsRequestModule {
};
exports.AssetsRequestModule = AssetsRequestModule;
exports.AssetsRequestModule = AssetsRequestModule = __decorate([
    (0, common_1.Module)({
        controllers: [assets_request_controller_1.AssetsRequestController],
        providers: [assets_request_service_1.AssetsRequestService, assets_settings_service_1.AssetsSettingsService],
    })
], AssetsRequestModule);
//# sourceMappingURL=assets-request.module.js.map