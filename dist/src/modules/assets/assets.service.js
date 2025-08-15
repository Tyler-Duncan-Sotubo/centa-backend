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
var AssetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const useful_life_service_1 = require("./useful-life.service");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const audit_service_1 = require("../audit/audit.service");
const assets_schema_1 = require("./schema/assets.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../core/schema");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_bulk_asset_dto_1 = require("./dto/create-bulk-asset.dto");
const asset_reports_schema_1 = require("./schema/asset-reports.schema");
const cache_service_1 = require("../../common/cache/cache.service");
let AssetsService = AssetsService_1 = class AssetsService {
    constructor(usefulLifeService, db, auditService, logger, cache) {
        this.usefulLifeService = usefulLifeService;
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.categoryMap = {
            Laptop: 'L',
            Monitor: 'M',
            Phone: 'P',
            Furniture: 'F',
            Other: 'O',
        };
        this.logger.setContext(AssetsService_1.name);
    }
    tags(companyId) {
        return [`company:${companyId}:assets`, `company:${companyId}:assets:list`];
    }
    async create(dto, user) {
        const existingAsset = await this.db
            .select()
            .from(assets_schema_1.assets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(assets_schema_1.assets.serialNumber, dto.serialNumber), (0, drizzle_orm_1.eq)(assets_schema_1.assets.companyId, user.companyId)))
            .execute();
        if (existingAsset.length > 0) {
            throw new common_1.BadRequestException(`Asset with serial number ${dto.serialNumber} already exists.`);
        }
        const usefulLife = await this.usefulLifeService.getUsefulLifeYears(dto.category, dto.name);
        const existingCount = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
            .from(assets_schema_1.assets)
            .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.category, dto.category))
            .execute();
        const categoryCode = this.categoryMap[dto.category] || 'A';
        const year = new Date(dto.purchaseDate).getFullYear().toString().slice(-2);
        const sequenceNumber = (existingCount[0].count + 1)
            .toString()
            .padStart(3, '0');
        const internalId = `${categoryCode}${year}-${sequenceNumber}`;
        const depreciationMethod = dto.category === 'Furniture' ? 'DecliningBalance' : 'StraightLine';
        const assetData = {
            ...dto,
            usefulLifeYears: usefulLife,
            depreciationMethod,
            status: dto.employeeId ? 'assigned' : 'available',
            companyId: user.companyId,
            employeeId: dto.employeeId || null,
            locationId: dto.locationId,
            internalId,
        };
        const [newAsset] = await this.db
            .insert(assets_schema_1.assets)
            .values(assetData)
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'asset',
            entityId: newAsset.id,
            userId: user.id,
            changes: {
                name: newAsset.name,
                serialNumber: newAsset.serialNumber,
                category: newAsset.category,
                purchasePrice: newAsset.purchasePrice,
                purchaseDate: newAsset.purchaseDate,
                usefulLifeYears: newAsset.usefulLifeYears,
                depreciationMethod: newAsset.depreciationMethod,
                employeeId: newAsset.employeeId,
                locationId: newAsset.locationId,
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return newAsset;
    }
    async bulkCreateAssets(companyId, rows) {
        this.logger.info({ companyId, rowCount: rows?.length ?? 0 }, 'bulkCreateAssets:start');
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new common_1.BadRequestException({ message: 'CSV has no rows' });
        }
        const trim = (v) => (typeof v === 'string' ? v.trim() : v);
        const sanitizeRow = (r) => {
            const out = {};
            for (const k of Object.keys(r))
                out[k] = trim(r[k]);
            return out;
        };
        const toDateString = (v) => {
            if (!v)
                return undefined;
            const raw = String(v).trim();
            const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
            const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
            const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
            let y, m, d;
            if (iso.test(raw))
                return raw;
            if (dmy.test(raw)) {
                const [, dd, mm, yyyy] = raw.match(dmy);
                y = +yyyy;
                m = +mm;
                d = +dd;
            }
            else if (mdy.test(raw)) {
                const [, mm, dd, yyyy] = raw.match(mdy);
                y = +yyyy;
                m = +mm;
                d = +dd;
            }
            else
                return undefined;
            const dt = new Date(Date.UTC(y, m - 1, d));
            return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
        };
        const toNumber = (v) => {
            if (v === null || v === undefined || v === '')
                return NaN;
            const n = Number(String(v).replace(/[, ]/g, ''));
            return Number.isFinite(n) ? n : NaN;
        };
        const normalizeLoc = (s) => s
            .toLowerCase()
            .replace(/\b(branch|office)\b/g, '')
            .replace(/\s+/g, '')
            .trim();
        const firstKeys = Object.keys(rows[0] ?? {});
        this.logger.debug(`bulkCreateAssets: first row keys -> ${JSON.stringify(firstKeys)}`);
        const allEmployees = await this.db
            .select({
            id: schema_1.employees.id,
            fullName: (0, drizzle_orm_1.sql) `LOWER(${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName})`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId))
            .execute();
        const employeeMap = new Map(allEmployees.map((e) => [e.fullName, e.id]));
        const allLocations = await this.db
            .select({
            id: schema_1.companyLocations.id,
            name: (0, drizzle_orm_1.sql) `LOWER(${schema_1.companyLocations.name})`,
        })
            .from(schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId))
            .execute();
        const locationKeyed = new Map(allLocations.map((l) => [l.name, l.id]));
        const locationFuzzy = new Map(allLocations.map((l) => [normalizeLoc(l.name), l.id]));
        this.logger.debug(`bulkCreateAssets: preloaded employees=${allEmployees.length}, locations=${allLocations.length}`);
        const errors = [];
        const dtos = [];
        for (let i = 0; i < rows.length; i++) {
            const raw = sanitizeRow(rows[i]);
            const name = (raw['Asset Name'] ?? '').toString();
            try {
                const category = (raw.Category ?? '').toString();
                const serial = (raw['Serial Number'] ?? '').toString();
                const price = toNumber(raw['Purchase Price']);
                const purchaseDate = toDateString(raw['Purchase Date']);
                const locationNameRaw = (raw['Location Name'] ?? '').toString();
                const exactKey = locationNameRaw.toLowerCase();
                let locationId = locationKeyed.get(exactKey);
                if (!locationId)
                    locationId = locationFuzzy.get(normalizeLoc(locationNameRaw));
                if (!name)
                    throw new Error(`"Asset Name" is required`);
                if (!category)
                    throw new Error(`"Category" is required`);
                if (!serial)
                    throw new Error(`"Serial Number" is required`);
                if (!Number.isFinite(price))
                    throw new Error(`"Purchase Price" is invalid`);
                if (!purchaseDate)
                    throw new Error(`"Purchase Date" is required/invalid`);
                if (!locationId)
                    throw new Error(`Unknown "Location Name": ${locationNameRaw}`);
                let employeeId;
                const empNameRaw = (raw['Employee Name'] ?? '').toString();
                if (empNameRaw) {
                    const empKey = empNameRaw.toLowerCase();
                    employeeId = employeeMap.get(empKey);
                }
                const dto = (0, class_transformer_1.plainToInstance)(create_bulk_asset_dto_1.CreateBulkAssetDto, {
                    name,
                    modelName: raw['Model Name'] ?? '',
                    color: raw.Color ?? '',
                    specs: raw.Specs ?? '',
                    category,
                    manufacturer: raw.Manufacturer ?? '',
                    serialNumber: serial,
                    purchasePrice: String(price),
                    purchaseDate,
                    warrantyExpiry: toDateString(raw['Warranty Expiry']),
                    lendDate: toDateString(raw['Lend Date']),
                    returnDate: toDateString(raw['Return Date']),
                });
                const validationErrors = await (0, class_validator_1.validate)(dto);
                if (validationErrors.length) {
                    throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
                }
                const year = new Date(dto.purchaseDate).getFullYear();
                dtos.push({ ...dto, employeeId, locationId, category, year });
            }
            catch (e) {
                errors.push({ index: i, name, reason: e?.message ?? 'Invalid row' });
            }
        }
        if (dtos.length === 0) {
            throw new common_1.BadRequestException({
                message: 'No valid rows in CSV',
                errors,
            });
        }
        const categoryMap = {
            Laptop: 'L',
            Monitor: 'M',
            Phone: 'P',
            Furniture: 'F',
            Other: 'O',
        };
        const depMap = {
            Laptop: 'StraightLine',
            Monitor: 'StraightLine',
            Phone: 'StraightLine',
            Furniture: 'DecliningBalance',
        };
        const prefixes = new Set();
        for (const d of dtos) {
            const yy = String(d.year).slice(-2);
            const code = categoryMap[d.category] ?? d.category.charAt(0).toUpperCase();
            prefixes.add(`${code}${yy}-`);
        }
        const prefixNext = new Map();
        for (const prefix of prefixes) {
            const existing = await this.db
                .select({ internalId: assets_schema_1.assets.internalId })
                .from(assets_schema_1.assets)
                .where((0, drizzle_orm_1.sql) `${assets_schema_1.assets.internalId} LIKE ${prefix + '%'}`)
                .orderBy((0, drizzle_orm_1.sql) `${assets_schema_1.assets.internalId} DESC`)
                .limit(500)
                .execute();
            let maxSeq = 0;
            for (const row of existing) {
                const m = row.internalId?.match(/^.+-(\d{3,})$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n) && n > maxSeq)
                        maxSeq = n;
                }
            }
            prefixNext.set(prefix, maxSeq + 1);
        }
        const inserted = [];
        for (let i = 0; i < dtos.length; i++) {
            const d = dtos[i];
            const yy = String(d.year).slice(-2);
            const code = categoryMap[d.category] ?? d.category.charAt(0).toUpperCase();
            const prefix = `${code}${yy}-`;
            const next = prefixNext.get(prefix) ?? 1;
            const seq = String(next).padStart(3, '0');
            const internalId = `${prefix}${seq}`;
            const usefulLife = await this.usefulLifeService.getUsefulLifeYears(d.category, d.name);
            const depreciationMethod = depMap[d.category] ?? 'StraightLine';
            try {
                const [asset] = await this.db
                    .insert(assets_schema_1.assets)
                    .values({
                    companyId,
                    name: d.name,
                    modelName: d.modelName,
                    color: d.color,
                    specs: d.specs,
                    category: d.category,
                    manufacturer: d.manufacturer,
                    serialNumber: d.serialNumber,
                    purchasePrice: d.purchasePrice,
                    purchaseDate: d.purchaseDate,
                    warrantyExpiry: d.warrantyExpiry ?? null,
                    employeeId: d.employeeId ?? null,
                    locationId: d.locationId,
                    lendDate: d.lendDate ?? null,
                    returnDate: d.returnDate ?? null,
                    usefulLifeYears: usefulLife,
                    depreciationMethod,
                    internalId,
                    status: d.employeeId ? 'assigned' : 'available',
                })
                    .returning()
                    .execute();
                inserted.push(asset);
                prefixNext.set(prefix, next + 1);
            }
            catch (e) {
                errors.push({
                    index: i,
                    name: d.name,
                    reason: e?.message ?? 'DB insert failed',
                });
            }
        }
        if (inserted.length === 0) {
            throw new common_1.BadRequestException({
                message: 'No assets were created from CSV',
                errors,
            });
        }
        await this.cache.bumpCompanyVersion(companyId);
        return { insertedCount: inserted.length, inserted, errors };
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['assets', 'list'], async () => {
            return this.db
                .select({
                id: assets_schema_1.assets.id,
                name: assets_schema_1.assets.name,
                modelName: assets_schema_1.assets.modelName,
                color: assets_schema_1.assets.color,
                specs: assets_schema_1.assets.specs,
                category: assets_schema_1.assets.category,
                manufacturer: assets_schema_1.assets.manufacturer,
                serialNumber: assets_schema_1.assets.serialNumber,
                purchasePrice: assets_schema_1.assets.purchasePrice,
                purchaseDate: assets_schema_1.assets.purchaseDate,
                depreciationMethod: assets_schema_1.assets.depreciationMethod,
                usefulLifeYears: assets_schema_1.assets.usefulLifeYears,
                lendDate: assets_schema_1.assets.lendDate,
                returnDate: assets_schema_1.assets.returnDate,
                warrantyExpiry: assets_schema_1.assets.warrantyExpiry,
                employeeId: assets_schema_1.assets.employeeId,
                locationId: assets_schema_1.assets.locationId,
                assignedTo: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                assignedEmail: schema_1.employees.email,
                location: schema_1.companyLocations.name,
                status: assets_schema_1.assets.status,
                internalId: assets_schema_1.assets.internalId,
            })
                .from(assets_schema_1.assets)
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(assets_schema_1.assets.employeeId, schema_1.employees.id))
                .innerJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(assets_schema_1.assets.locationId, schema_1.companyLocations.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(assets_schema_1.assets.companyId, companyId), (0, drizzle_orm_1.eq)(assets_schema_1.assets.isDeleted, false), (0, drizzle_orm_1.isNull)(assets_schema_1.assets.returnDate)))
                .orderBy((0, drizzle_orm_1.desc)(assets_schema_1.assets.purchaseDate))
                .execute();
        }, { tags: this.tags(companyId) });
    }
    async findOne(id) {
        const [asset] = await this.db
            .select()
            .from(assets_schema_1.assets)
            .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id))
            .execute();
        if (!asset) {
            throw new common_1.BadRequestException(`Asset with ID ${id} not found.`);
        }
        return asset;
    }
    async findByEmployeeId(employeeId) {
        const assetsByEmployee = await this.db
            .select({
            id: assets_schema_1.assets.id,
            name: assets_schema_1.assets.name,
            modelName: assets_schema_1.assets.modelName,
            category: assets_schema_1.assets.category,
            serialNumber: assets_schema_1.assets.serialNumber,
            lendDate: assets_schema_1.assets.lendDate,
            location: schema_1.companyLocations.name,
            status: assets_schema_1.assets.status,
            internalId: assets_schema_1.assets.internalId,
            hasReport: (0, drizzle_orm_1.sql) `EXISTS (
          SELECT 1
          FROM ${asset_reports_schema_1.assetReports} ar
          WHERE ar.asset_id = ${assets_schema_1.assets.id}
        )`.as('hasReport'),
        })
            .from(assets_schema_1.assets)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(assets_schema_1.assets.employeeId, schema_1.employees.id))
            .leftJoin(asset_reports_schema_1.assetReports, (0, drizzle_orm_1.eq)(assets_schema_1.assets.id, asset_reports_schema_1.assetReports.assetId))
            .innerJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(assets_schema_1.assets.locationId, schema_1.companyLocations.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(assets_schema_1.assets.employeeId, employeeId), (0, drizzle_orm_1.eq)(assets_schema_1.assets.isDeleted, false)))
            .orderBy((0, drizzle_orm_1.desc)(assets_schema_1.assets.purchaseDate))
            .execute();
        return assetsByEmployee;
    }
    update(id, updateAssetDto, user) {
        return this.db.transaction(async (tx) => {
            const [existingAsset] = await tx
                .select()
                .from(assets_schema_1.assets)
                .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id))
                .execute();
            if (!existingAsset) {
                throw new common_1.BadRequestException(`Asset with ID ${id} not found.`);
            }
            const [updatedAsset] = await tx
                .update(assets_schema_1.assets)
                .set({
                ...updateAssetDto,
                status: updateAssetDto.employeeId ? 'assigned' : 'available',
                updatedAt: new Date().toISOString(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id), (0, drizzle_orm_1.eq)(assets_schema_1.assets.companyId, user.companyId)))
                .returning()
                .execute();
            await this.auditService.logAction({
                action: 'update',
                entity: 'asset',
                entityId: updatedAsset.id,
                userId: user.id,
                changes: { id: updatedAsset.id },
            });
            await this.cache.bumpCompanyVersion(user.companyId);
            return updatedAsset;
        });
    }
    async requestReturn(id) {
        const [existingAsset] = await this.db
            .select()
            .from(assets_schema_1.assets)
            .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id))
            .execute();
        if (!existingAsset) {
            throw new common_1.BadRequestException(`Asset with ID ${id} not found.`);
        }
        if (existingAsset.returnDate) {
            throw new common_1.BadRequestException(`Asset with ID ${id} has already been returned.`);
        }
    }
    async changeStatus(id, status, user) {
        await this.findOne(id);
        const [updatedAsset] = await this.db
            .update(assets_schema_1.assets)
            .set({
            status,
            employeeId: this.shouldAssignToEmployee(status) ? user.id : null,
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id), (0, drizzle_orm_1.eq)(assets_schema_1.assets.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'change_status',
            entity: 'asset',
            entityId: updatedAsset.id,
            userId: user.id,
            changes: {
                id: updatedAsset.id,
                status: updatedAsset.status,
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return updatedAsset;
    }
    remove(id, user) {
        return this.db.transaction(async (tx) => {
            const [existingAsset] = await tx
                .select()
                .from(assets_schema_1.assets)
                .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id))
                .execute();
            if (!existingAsset) {
                throw new common_1.BadRequestException(`Asset with ID ${id} not found.`);
            }
            await tx
                .update(assets_schema_1.assets)
                .set({
                isDeleted: true,
                updatedAt: new Date().toDateString(),
            })
                .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.id, id))
                .execute();
            await this.auditService.logAction({
                action: 'delete',
                entity: 'asset',
                entityId: existingAsset.id,
                userId: user.id,
                changes: {
                    id: existingAsset.id,
                    name: existingAsset.name,
                    serialNumber: existingAsset.serialNumber,
                },
            });
            await this.cache.bumpCompanyVersion(user.companyId);
            return { message: `Asset with ID ${id} deleted successfully.` };
        });
    }
    shouldAssignToEmployee(status) {
        const unassignedStatuses = ['available', 'maintenance', 'lost', 'retired'];
        return !unassignedStatuses.includes(status);
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = AssetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [useful_life_service_1.UsefulLifeService, Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map