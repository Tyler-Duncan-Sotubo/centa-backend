// src/modules/attendance/location/attendance-location.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { fromZonedTime } from 'date-fns-tz';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { companyLocations } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AttendanceLocationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:attendance`,
      `company:${companyId}:attendance:records`,
      `company:${companyId}:attendance:dashboards`,
    ];
  }

  pickTz(tz?: string): string {
    try {
      if (tz) {
        fromZonedTime('2000-01-01T00:00:00', tz);
        return tz;
      }
    } catch {}
    return process.env.DEFAULT_TZ || 'Africa/Lagos';
  }

  private isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusInKm = 0.1,
  ) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= radiusInKm;
  }

  async checkLocation(latitude: string, longitude: string, employee: any) {
    if (!employee) throw new BadRequestException('Employee not found');

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new BadRequestException('Invalid latitude/longitude provided.');
    }

    if (!employee.locationId) {
      throw new BadRequestException(
        'No assigned office location for this employee. Please contact HR/admin.',
      );
    }

    const officeLocations = await this.cache.getOrSetVersioned(
      employee.companyId,
      ['attendance', 'locations', 'all'],
      async () =>
        this.db
          .select()
          .from(companyLocations)
          .where(eq(companyLocations.companyId, employee.companyId))
          .execute(),
      { ttlSeconds: 300, tags: this.tags(employee.companyId) },
    );

    if (!officeLocations || officeLocations.length === 0) {
      throw new BadRequestException(
        'No company locations configured. Please contact admin.',
      );
    }

    const activeLocations = officeLocations.filter((l) => l.isActive);
    const assigned = activeLocations.find((l) => l.id === employee.locationId);

    if (!assigned)
      throw new BadRequestException('Assigned office location not found.');

    const isWithin = (loc: any) =>
      this.isWithinRadius(
        lat,
        lon,
        Number(loc.latitude),
        Number(loc.longitude),
      );

    // assigned always allowed
    if (isWithin(assigned)) return;

    // fallback ONLY to OFFICE (active)
    const fallbackOffices = activeLocations.filter(
      (l) => l.locationType === 'OFFICE',
    );
    if (fallbackOffices.some(isWithin)) return;

    throw new BadRequestException('You are not at a valid company location.');
  }
}
