"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const leave_settings_service_1 = require("./leave-settings.service");
const leave_settings_controller_1 = require("./leave-settings.controller");
let LeaveSettingsModule = class LeaveSettingsModule {
};
exports.LeaveSettingsModule = LeaveSettingsModule;
exports.LeaveSettingsModule = LeaveSettingsModule = __decorate([
    (0, common_1.Module)({
        controllers: [leave_settings_controller_1.LeaveSettingsController],
        providers: [leave_settings_service_1.LeaveSettingsService],
    })
], LeaveSettingsModule);
//# sourceMappingURL=leave-settings.module.js.map