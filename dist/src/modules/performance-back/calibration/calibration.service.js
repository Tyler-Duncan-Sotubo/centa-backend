"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationService = void 0;
const common_1 = require("@nestjs/common");
let CalibrationService = class CalibrationService {
    create(createCalibrationDto) {
        return 'This action adds a new calibration';
    }
    findAll() {
        return `This action returns all calibration`;
    }
    findOne(id) {
        return `This action returns a #${id} calibration`;
    }
    update(id, updateCalibrationDto) {
        return `This action updates a #${id} calibration`;
    }
    remove(id) {
        return `This action removes a #${id} calibration`;
    }
};
exports.CalibrationService = CalibrationService;
exports.CalibrationService = CalibrationService = __decorate([
    (0, common_1.Injectable)()
], CalibrationService);
//# sourceMappingURL=calibration.service.js.map