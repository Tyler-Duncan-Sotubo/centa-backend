"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaySchedulesModule = void 0;
const common_1 = require("@nestjs/common");
const pay_schedules_service_1 = require("./pay-schedules.service");
const pay_schedules_controller_1 = require("./pay-schedules.controller");
let PaySchedulesModule = class PaySchedulesModule {
};
exports.PaySchedulesModule = PaySchedulesModule;
exports.PaySchedulesModule = PaySchedulesModule = __decorate([
    (0, common_1.Module)({
        controllers: [pay_schedules_controller_1.PaySchedulesController],
        providers: [pay_schedules_service_1.PaySchedulesService],
        exports: [pay_schedules_service_1.PaySchedulesService],
    })
], PaySchedulesModule);
//# sourceMappingURL=pay-schedules.module.js.map