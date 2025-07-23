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
exports.HolidaysController = void 0;
const common_1 = require("@nestjs/common");
const holidays_service_1 = require("./holidays.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const create_holiday_dto_1 = require("./dto/create-holiday.dto");
const update_holiday_dto_1 = require("./dto/update-holiday.dto");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
let HolidaysController = class HolidaysController extends base_controller_1.BaseController {
    constructor(holidaysService) {
        super();
        this.holidaysService = holidaysService;
    }
    async getCustomHolidays(user) {
        return this.holidaysService.findAll(user.companyId);
    }
    async getUpcomingPublicHolidays(user) {
        return this.holidaysService.getUpcomingPublicHolidays('NG', user.companyId);
    }
    async bulkCreateLeavePolicies(rows, user) {
        return this.holidaysService.bulkCreateHolidays(user.companyId, rows);
    }
    async createCustomHolidays(dto, user) {
        return this.holidaysService.createHoliday(dto, user);
    }
    async updateHoliday(dto, user, id) {
        return this.holidaysService.update(id, dto, user);
    }
    async deleteHoliday(user, id) {
        return this.holidaysService.delete(id, user);
    }
};
exports.HolidaysController = HolidaysController;
__decorate([
    (0, common_1.Get)('custom-holidays'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['holidays.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "getCustomHolidays", null);
__decorate([
    (0, common_1.Get)('upcoming-holidays'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['holidays.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "getUpcomingPublicHolidays", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['holidays.manage']),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 200 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "bulkCreateLeavePolicies", null);
__decorate([
    (0, common_1.Post)('custom-holidays'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['holidays.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_holiday_dto_1.CreateHolidayDto, Object]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "createCustomHolidays", null);
__decorate([
    (0, common_1.Patch)('update-holiday/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['holidays.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_holiday_dto_1.UpdateHolidayDto, Object, String]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "updateHoliday", null);
__decorate([
    (0, common_1.Delete)('delete-holiday/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['holidays.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "deleteHoliday", null);
exports.HolidaysController = HolidaysController = __decorate([
    (0, common_1.Controller)('holidays'),
    __metadata("design:paramtypes", [holidays_service_1.HolidaysService])
], HolidaysController);
//# sourceMappingURL=holidays.controller.js.map