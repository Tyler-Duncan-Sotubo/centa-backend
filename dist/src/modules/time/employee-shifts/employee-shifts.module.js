"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeShiftsModule = void 0;
const common_1 = require("@nestjs/common");
const employee_shifts_service_1 = require("./employee-shifts.service");
const employee_shifts_controller_1 = require("./employee-shifts.controller");
let EmployeeShiftsModule = class EmployeeShiftsModule {
};
exports.EmployeeShiftsModule = EmployeeShiftsModule;
exports.EmployeeShiftsModule = EmployeeShiftsModule = __decorate([
    (0, common_1.Module)({
        controllers: [employee_shifts_controller_1.EmployeeShiftsController],
        providers: [employee_shifts_service_1.EmployeeShiftsService],
        imports: [],
        exports: [employee_shifts_service_1.EmployeeShiftsService],
    })
], EmployeeShiftsModule);
//# sourceMappingURL=employee-shifts.module.js.map