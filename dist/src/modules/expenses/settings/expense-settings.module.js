"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const expense_settings_service_1 = require("./expense-settings.service");
const expense_settings_controller_1 = require("./expense-settings.controller");
let ExpenseSettingsModule = class ExpenseSettingsModule {
};
exports.ExpenseSettingsModule = ExpenseSettingsModule;
exports.ExpenseSettingsModule = ExpenseSettingsModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [expense_settings_controller_1.ExpenseSettingsController],
        providers: [expense_settings_service_1.ExpensesSettingsService],
        exports: [expense_settings_service_1.ExpensesSettingsService],
    })
], ExpenseSettingsModule);
//# sourceMappingURL=expense-settings.module.js.map