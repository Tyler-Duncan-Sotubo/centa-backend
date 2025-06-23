"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Audit = void 0;
const common_1 = require("@nestjs/common");
const audit_constant_1 = require("./constant/audit.constant");
const Audit = (meta) => (0, common_1.SetMetadata)(audit_constant_1.AUDIT_META_KEY, meta);
exports.Audit = Audit;
//# sourceMappingURL=audit.decorator.js.map