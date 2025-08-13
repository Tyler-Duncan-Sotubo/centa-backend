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
exports.CandidatesService = void 0;
const common_1 = require("@nestjs/common");
const schema_1 = require("../schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
let CandidatesService = class CandidatesService {
    constructor(db) {
        this.db = db;
    }
    async findAll(options = {}) {
        const { search, limit = 10, offset = 0, sortBy = 'name', sortDirection = 'asc', } = options;
        const sortColumnMap = {
            name: schema_1.candidates.fullName,
            email: schema_1.candidates.email,
            createdAt: schema_1.candidates.createdAt,
        };
        const sortColumn = sortColumnMap[sortBy] || schema_1.candidates.fullName;
        const sortFn = sortDirection === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        const rows = await this.db
            .select({
            id: schema_1.candidates.id,
            name: schema_1.candidates.fullName,
            email: schema_1.candidates.email,
            phone: schema_1.candidates.phone,
            resumeUrl: schema_1.candidates.resumeUrl,
            profile: schema_1.candidates.profile,
            skillName: schema_1.skills.name,
        })
            .from(schema_1.candidates)
            .leftJoin(schema_1.candidate_skills, (0, drizzle_orm_1.eq)(schema_1.candidate_skills.candidateId, schema_1.candidates.id))
            .leftJoin(schema_1.skills, (0, drizzle_orm_1.eq)(schema_1.candidate_skills.skillId, schema_1.skills.id))
            .where(search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.candidates.fullName, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.candidates.email, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.skills.name, `%${search}%`))
            : undefined)
            .orderBy(sortFn(sortColumn))
            .limit(limit)
            .offset(offset);
        const result = {};
        for (const row of rows) {
            if (!result[row.id]) {
                result[row.id] = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    resumeUrl: row.resumeUrl,
                    profile: row.profile,
                    skills: [],
                };
            }
            if (row.skillName) {
                result[row.id].skills.push(row.skillName);
            }
        }
        return Object.values(result);
    }
    findOne(id) {
        return `This action returns a #${id} candidate`;
    }
};
exports.CandidatesService = CandidatesService;
exports.CandidatesService = CandidatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], CandidatesService);
//# sourceMappingURL=candidates.service.js.map