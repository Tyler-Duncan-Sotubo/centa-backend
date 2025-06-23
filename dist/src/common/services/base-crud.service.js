"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCrudService = void 0;
const diff_1 = require("../../utils/diff");
const drizzle_orm_1 = require("drizzle-orm");
const common_1 = require("@nestjs/common");
class BaseCrudService {
    constructor(db, audit) {
        this.db = db;
        this.audit = audit;
    }
    async updateWithAudit(companyId, id, dto, auditMeta, userId, ip) {
        return this.db.transaction(async (trx) => {
            const [before] = await trx
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table['companyId'], companyId), (0, drizzle_orm_1.eq)(this.table['id'], id)))
                .execute();
            if (!before) {
                throw new common_1.NotFoundException(`${auditMeta.entity} ${id} not found`);
            }
            const [after] = await trx
                .update(this.table)
                .set(dto)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table['companyId'], companyId), (0, drizzle_orm_1.eq)(this.table['id'], id)))
                .returning({
                id: this.table['id'],
                ...Object.fromEntries(auditMeta.fields.map((field) => [
                    field,
                    this.table[field],
                ])),
            })
                .execute();
            const changes = (0, diff_1.diffRecords)(before, after, auditMeta.fields);
            if (!Object.keys(changes).length) {
                return after;
            }
            await this.audit.logAction({
                entity: auditMeta.entity,
                action: auditMeta.action,
                userId,
                entityId: id,
                ipAddress: ip,
                changes,
            });
            return after;
        });
    }
}
exports.BaseCrudService = BaseCrudService;
//# sourceMappingURL=base-crud.service.js.map