"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffboardingModule = void 0;
const common_1 = require("@nestjs/common");
const offboarding_service_1 = require("./offboarding.service");
const offboarding_controller_1 = require("./offboarding.controller");
const offboarding_config_controller_1 = require("./offboarding-config.controller");
const offboarding_config_service_1 = require("./offboarding-config.service");
const offboarding_seeder_service_1 = require("./offboarding-seeder.service");
let OffboardingModule = class OffboardingModule {
};
exports.OffboardingModule = OffboardingModule;
exports.OffboardingModule = OffboardingModule = __decorate([
    (0, common_1.Module)({
        controllers: [offboarding_controller_1.OffboardingController, offboarding_config_controller_1.OffboardingConfigController],
        providers: [
            offboarding_service_1.OffboardingService,
            offboarding_config_service_1.OffboardingConfigService,
            offboarding_seeder_service_1.OffboardingSeederService,
        ],
    })
], OffboardingModule);
//# sourceMappingURL=offboarding.module.js.map