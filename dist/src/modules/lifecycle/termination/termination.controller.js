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
exports.TerminationController = void 0;
const common_1 = require("@nestjs/common");
const termination_service_1 = require("./termination.service");
const create_termination_dto_1 = require("./dto/create-termination.dto");
const update_termination_dto_1 = require("./dto/update-termination.dto");
let TerminationController = class TerminationController {
    constructor(terminationService) {
        this.terminationService = terminationService;
    }
    create(createTerminationDto) {
        return this.terminationService.create(createTerminationDto);
    }
    findAll() {
        return this.terminationService.findAll();
    }
    findOne(id) {
        return this.terminationService.findOne(+id);
    }
    update(id, updateTerminationDto) {
        return this.terminationService.update(+id, updateTerminationDto);
    }
    remove(id) {
        return this.terminationService.remove(+id);
    }
};
exports.TerminationController = TerminationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_termination_dto_1.CreateTerminationDto]),
    __metadata("design:returntype", void 0)
], TerminationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TerminationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TerminationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_termination_dto_1.UpdateTerminationDto]),
    __metadata("design:returntype", void 0)
], TerminationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TerminationController.prototype, "remove", null);
exports.TerminationController = TerminationController = __decorate([
    (0, common_1.Controller)('termination'),
    __metadata("design:paramtypes", [termination_service_1.TerminationService])
], TerminationController);
//# sourceMappingURL=termination.controller.js.map