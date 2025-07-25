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
const audit_constant_1 = require("./constant/audit.constant");
let AuditInterceptor = class AuditInterceptor {
    constructor(auditService, reflector) {
        this.auditService = auditService;
        this.reflector = reflector;
    }
    intercept(context, next) {
        const meta = this.reflector.get(audit_constant_1.AUDIT_META_KEY, context.getHandler());
        if (!meta) {
            return next.handle();
        }
        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id;
        const entityId = meta.getEntityId ? meta.getEntityId(req) : undefined;
        const forwarded = req.headers['x-forwarded-for'];
        const ip = Array.isArray(forwarded)
            ? forwarded[0]
            : forwarded || req.socket?.remoteAddress || req.connection?.remoteAddress;
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => {
                this.auditService.logAction({
                    action: meta.action,
                    entity: meta.entity,
                    userId,
                    entityId,
                    ipAddress: req.ip,
                });
            },
            error: (err) => {
                const safeMessage = err?.response?.message || err?.message || 'Unknown error';
                this.auditService.logAction({
                    action: `${meta.action}_FAILED`,
                    entity: meta.entity,
                    userId,
                    entityId,
                    details: safeMessage,
                    ipAddress: ip,
                });
            },
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