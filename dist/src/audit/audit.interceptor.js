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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const audit_service_1 = require("./audit.service");
let AuditInterceptor = class AuditInterceptor {
    constructor(auditService, reflector) {
        this.auditService = auditService;
        this.reflector = reflector;
    }
    intercept(context, next) {
        const auditMeta = this.reflector.get('audit', context.getHandler());
        if (!auditMeta)
            return next.handle();
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        return next.handle().pipe((0, rxjs_1.tap)(async () => {
            await this.auditService.logAction(auditMeta.action, auditMeta.entity, userId);
        }));
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        core_1.Reflector])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map