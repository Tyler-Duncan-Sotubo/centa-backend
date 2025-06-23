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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
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
let AssetsService = class AssetsService {
    constructor(usefulLifeService, db, auditService) {
        this.usefulLifeService = usefulLifeService;
        this.db = db;
        this.auditService = auditService;
        this.categoryMap = {
            Laptop: 'L',
            Monitor: 'M',
            Phone: 'P',
            Furniture: 'F',
            Other: 'O',
        };
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
            .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.category, dto.category));
        const categoryCode = this.categoryMap[dto.category] || 'A';
        const year = new Date(dto.purchaseDate).getFullYear().toString().slice(-2);
        const sequenceNumber = (existingCount[0].count + 1)
            .toString()
            .padStart(3, '0');
        const internalId = `${categoryCode}${year}-${sequenceNumber}`;
        const depreciationMethod = (() => {
            switch (dto.category) {
                case 'Laptop':
                case 'Monitor':
                case 'Phone':
                    return 'StraightLine';
                case 'Furniture':
                    return 'DecliningBalance';
                default:
                    return 'StraightLine';
            }
        })();
        const assetData = {
            ...dto,
            usefulLifeYears: usefulLife,
            depreciationMethod: depreciationMethod,
            status: dto.employeeId ? 'assigned' : 'available',
            companyId: user.companyId,
            employeeId: dto.employeeId || null,
            locationId: dto.locationId,
            internalId: internalId,
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
        return newAsset;
    }
    async bulkCreateAssets(companyId, rows) {
        const allEmployees = await this.db
            .select({
            id: schema_1.employees.id,
            fullName: (0, drizzle_orm_1.sql) `LOWER(${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName})`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId));
        const employeeMap = new Map(allEmployees.map((e) => [e.fullName.toLowerCase(), e.id]));
        const allLocations = await this.db
            .select({
            id: schema_1.companyLocations.id,
            name: (0, drizzle_orm_1.sql) `LOWER(${schema_1.companyLocations.name})`,
        })
            .from(schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId));
        const locationMap = new Map(allLocations.map((l) => [l.name.toLowerCase(), l.id]));
        const dtos = [];
        const existingCounts = new Map();
        for (const dto of dtos) {
            const year = new Date(dto.purchaseDate)
                .getFullYear()
                .toString()
                .slice(-2);
            const prefix = `${dto.category}-${year}`;
            if (!existingCounts.has(prefix)) {
                const [{ count }] = await this.db
                    .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
                    .from(assets_schema_1.assets)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(assets_schema_1.assets.companyId, companyId), (0, drizzle_orm_1.eq)(assets_schema_1.assets.category, dto.category), (0, drizzle_orm_1.sql) `EXTRACT(YEAR FROM ${assets_schema_1.assets.purchaseDate}) = ${Number('20' + year)}`));
                existingCounts.set(prefix, Number(count));
            }
        }
        for (const row of rows) {
            const employeeName = row['Employee Name']?.trim().toLowerCase();
            const employeeId = employeeName
                ? employeeMap.get(employeeName)
                : undefined;
            if (employeeName && !employeeId) {
                console.warn(`Skipping row with unknown employee: ${employeeName}`);
                continue;
            }
            const locationName = row['Location Name']?.trim().toLowerCase();
            const locationId = locationMap.get(locationName);
            if (!locationId) {
                console.warn(`Skipping row with unknown location: ${locationName}`);
                continue;
            }
            const dto = (0, class_transformer_1.plainToInstance)(create_bulk_asset_dto_1.CreateBulkAssetDto, {
                name: row['Asset Name'],
                modelName: row['Model Name'],
                color: row['Color'],
                specs: row['Specs'],
                category: row['Category'],
                manufacturer: row['Manufacturer'],
                serialNumber: row['Serial Number'],
                purchasePrice: String(row['Purchase Price']),
                purchaseDate: row['Purchase Date'],
                warrantyExpiry: row['Warranty Expiry'] || undefined,
                lendDate: row['Lend Date'] || undefined,
                returnDate: row['Return Date'] || undefined,
            });
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length) {
                console.warn(`❌ Skipping invalid asset row:`, errors);
                continue;
            }
            dtos.push({ ...dto, employeeId, locationId });
        }
        const inserted = await this.db.transaction(async (trx) => {
            const insertedAssets = [];
            const usefulLifePromises = dtos.map((dto) => this.usefulLifeService.getUsefulLifeYears(dto.category, dto.name));
            const usefulLives = await Promise.all(usefulLifePromises);
            for (let i = 0; i < dtos.length; i++) {
                const dto = dtos[i];
                const category = dto.category;
                const categoryCode = this.categoryMap?.[category] || category.charAt(0).toUpperCase();
                const year = new Date(dto.purchaseDate)
                    .getFullYear()
                    .toString()
                    .slice(-2);
                const prefix = `${dto.category}-${year}`;
                const count = existingCounts.get(prefix) || 0;
                existingCounts.set(prefix, count + 1);
                const sequenceNumber = (count + 1).toString().padStart(3, '0');
                const internalId = `${categoryCode}${year}-${sequenceNumber}`;
                const depreciationMap = {
                    Laptop: 'StraightLine',
                    Monitor: 'StraightLine',
                    Phone: 'StraightLine',
                    Furniture: 'DecliningBalance',
                };
                const depreciationMethod = depreciationMap[dto.category] || 'StraightLine';
                const usefulLife = usefulLives[i];
                const [asset] = await trx
                    .insert(assets_schema_1.assets)
                    .values({
                    companyId,
                    name: dto.name,
                    modelName: dto.modelName,
                    color: dto.color,
                    specs: dto.specs,
                    category: dto.category,
                    manufacturer: dto.manufacturer,
                    serialNumber: dto.serialNumber,
                    purchasePrice: dto.purchasePrice,
                    purchaseDate: dto.purchaseDate,
                    warrantyExpiry: dto.warrantyExpiry,
                    employeeId: dto.employeeId ?? null,
                    locationId: dto.locationId,
                    lendDate: dto.lendDate?.toString(),
                    returnDate: dto.returnDate?.toString(),
                    usefulLifeYears: usefulLife,
                    depreciationMethod,
                    internalId,
                    status: dto.employeeId ? 'assigned' : 'available',
                })
                    .returning()
                    .execute();
                insertedAssets.push(asset);
            }
            return insertedAssets;
        });
        return inserted;
    }
    async findAll(companyId) {
        const allAssets = await this.db
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
        return allAssets;
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
                changes: {
                    id: updatedAsset.id,
                },
            });
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
            status: status,
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
            return { message: `Asset with ID ${id} deleted successfully.` };
        });
    }
    shouldAssignToEmployee(status) {
        const unassignedStatuses = ['available', 'maintenance', 'lost', 'retired'];
        return !unassignedStatuses.includes(status);
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [useful_life_service_1.UsefulLifeService, Object, audit_service_1.AuditService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map