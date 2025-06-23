"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayGroupsModule = void 0;
const common_1 = require("@nestjs/common");
const pay_groups_service_1 = require("./pay-groups.service");
const pay_groups_controller_1 = require("./pay-groups.controller");
let PayGroupsModule = class PayGroupsModule {
};
exports.PayGroupsModule = PayGroupsModule;
exports.PayGroupsModule = PayGroupsModule = __decorate([
    (0, common_1.Module)({
        controllers: [pay_groups_controller_1.PayGroupsController],
        providers: [pay_groups_service_1.PayGroupsService],
        exports: [pay_groups_service_1.PayGroupsService],
    })
], PayGroupsModule);
//# sourceMappingURL=pay-groups.module.js.map