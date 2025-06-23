"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservedDaysModule = void 0;
const common_1 = require("@nestjs/common");
const reserved_days_service_1 = require("./reserved-days.service");
const reserved_days_controller_1 = require("./reserved-days.controller");
let ReservedDaysModule = class ReservedDaysModule {
};
exports.ReservedDaysModule = ReservedDaysModule;
exports.ReservedDaysModule = ReservedDaysModule = __decorate([
    (0, common_1.Module)({
        controllers: [reserved_days_controller_1.ReservedDaysController],
        providers: [reserved_days_service_1.ReservedDaysService],
        exports: [reserved_days_service_1.ReservedDaysService],
    })
], ReservedDaysModule);
//# sourceMappingURL=reserved-days.module.js.map