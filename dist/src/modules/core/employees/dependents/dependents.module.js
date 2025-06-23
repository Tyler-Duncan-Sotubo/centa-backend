"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependentsModule = void 0;
const common_1 = require("@nestjs/common");
const dependents_service_1 = require("./dependents.service");
const dependents_controller_1 = require("./dependents.controller");
let DependentsModule = class DependentsModule {
};
exports.DependentsModule = DependentsModule;
exports.DependentsModule = DependentsModule = __decorate([
    (0, common_1.Module)({
        controllers: [dependents_controller_1.DependentsController],
        providers: [dependents_service_1.DependentsService],
        exports: [dependents_service_1.DependentsService],
    })
], DependentsModule);
//# sourceMappingURL=dependents.module.js.map