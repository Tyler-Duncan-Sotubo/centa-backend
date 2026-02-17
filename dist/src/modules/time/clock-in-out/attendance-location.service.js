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
exports.AttendanceLocationService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const date_fns_tz_1 = require("date-fns-tz");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let AttendanceLocationService = class AttendanceLocationService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    tags(companyId) {
        return [
            `company:${companyId}:attendance`,
            `company:${companyId}:attendance:records`,
            `company:${companyId}:attendance:dashboards`,
        ];
    }
    pickTz(tz) {
        try {
            if (tz) {
                (0, date_fns_tz_1.fromZonedTime)('2000-01-01T00:00:00', tz);
                return tz;
            }
        }
        catch { }
        return process.env.DEFAULT_TZ || 'Africa/Lagos';
    }
    isWithinRadius(lat1, lon1, lat2, lon2, radiusInKm = 0.1) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c <= radiusInKm;
    }
    async checkLocation(latitude, longitude, employee) {
        if (!employee)
            throw new common_1.BadRequestException('Employee not found');
        const lat = Number(latitude);
        const lon = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new common_1.BadRequestException('Invalid latitude/longitude provided.');
        }
        if (!employee.locationId) {
            throw new common_1.BadRequestException('No assigned office location for this employee. Please contact HR/admin.');
        }
        const officeLocations = await this.cache.getOrSetVersioned(employee.companyId, ['attendance', 'locations', 'all'], async () => this.db
            .select()
            .from(schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, employee.companyId))
            .execute(), { ttlSeconds: 300, tags: this.tags(employee.companyId) });
        if (!officeLocations || officeLocations.length === 0) {
            throw new common_1.BadRequestException('No company locations configured. Please contact admin.');
        }
        const activeLocations = officeLocations.filter((l) => l.isActive);
        const assigned = activeLocations.find((l) => l.id === employee.locationId);
        if (!assigned)
            throw new common_1.BadRequestException('Assigned office location not found.');
        const isWithin = (loc) => this.isWithinRadius(lat, lon, Number(loc.latitude), Number(loc.longitude));
        if (isWithin(assigned))
            return;
        const fallbackOffices = activeLocations.filter((l) => l.locationType === 'OFFICE');
        if (fallbackOffices.some(isWithin))
            return;
        throw new common_1.BadRequestException('You are not at a valid company location.');
    }
};
exports.AttendanceLocationService = AttendanceLocationService;
exports.AttendanceLocationService = AttendanceLocationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], AttendanceLocationService);
//# sourceMappingURL=attendance-location.service.js.map