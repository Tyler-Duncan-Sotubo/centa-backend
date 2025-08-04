"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationController = void 0;
const common_1 = require("@nestjs/common");
const calibration_service_1 = require("./calibration.service");
const create_calibration_dto_1 = require("./dto/create-calibration.dto");
const update_calibration_dto_1 = require("./dto/update-calibration.dto");
let CalibrationController = class CalibrationController {
    constructor(calibrationService) {
        this.calibrationService = calibrationService;
    }
    create(createCalibrationDto) {
        return this.calibrationService.create(createCalibrationDto);
    }
    findAll() {
        return this.calibrationService.findAll();
    }
    findOne(id) {
        return this.calibrationService.findOne(+id);
    }
    update(id, updateCalibrationDto) {
        return this.calibrationService.update(+id, updateCalibrationDto);
    }
    remove(id) {
        return this.calibrationService.remove(+id);
    }
};
exports.CalibrationController = CalibrationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_calibration_dto_1.CreateCalibrationDto]),
    __metadata("design:returntype", void 0)
], CalibrationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CalibrationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CalibrationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_calibration_dto_1.UpdateCalibrationDto]),
    __metadata("design:returntype", void 0)
], CalibrationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CalibrationController.prototype, "remove", null);
exports.CalibrationController = CalibrationController = __decorate([
    (0, common_1.Controller)('calibration'),
    __metadata("design:paramtypes", [calibration_service_1.CalibrationService])
], CalibrationController);
//# sourceMappingURL=calibration.controller.js.map