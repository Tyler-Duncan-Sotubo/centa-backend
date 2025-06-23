"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidaysModule = void 0;
const common_1 = require("@nestjs/common");
const holidays_service_1 = require("./holidays.service");
const holidays_controller_1 = require("./holidays.controller");
let HolidaysModule = class HolidaysModule {
};
exports.HolidaysModule = HolidaysModule;
exports.HolidaysModule = HolidaysModule = __decorate([
    (0, common_1.Module)({
        controllers: [holidays_controller_1.HolidaysController],
        providers: [holidays_service_1.HolidaysService],
        exports: [holidays_service_1.HolidaysService],
    })
], HolidaysModule);
//# sourceMappingURL=holidays.module.js.map