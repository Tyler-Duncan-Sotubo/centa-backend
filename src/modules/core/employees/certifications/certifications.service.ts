import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq } from 'drizzle-orm';
import { employeeCertifications } from '../schema/certifications.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CertificationsService {
  protected table = employeeCertifications;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope = employeeId
    return [
      `employee:${scope}:certifications`,
      `employee:${scope}:certifications:list`,
      `employee:${scope}:certifications:detail`,
    ];
  }

  async create(
    employeeId: string,
    dto: CreateCertificationDto,
    userId: string,
    ip: string,
  ) {
    const [created] = await this.db
      .insert(this.table)
      .values({ employeeId, ...dto })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'EmployeeCertification',
      details: 'Created new employee certification',
      userId,
      entityId: employeeId,
      ipAddress: ip,
      changes: { ...dto },
    });

    // Invalidate employee-scoped caches
    await this.cache.bumpCompanyVersion(employeeId);

    return created;
  }

  // READ (cached per employee)
  findAll(employeeId: string) {
    return this.cache.getOrSetVersioned(
      employeeId,
      ['certifications', 'list', employeeId],
      async () => {
        const rows = await this.db
          .select()
          .from(this.table)
          .where(eq(this.table.employeeId, employeeId))
          .execute();
        return rows;
      },
      { tags: this.tags(employeeId) },
    );
  }

  // READ (cached per employee + cert id)
  async findOne(certificationId: string) {
    // We don't have employeeId in signature; cache under a global-ish scope keyed by id.
    // If you prefer strictly employee-scoped, pass employeeId and change the key.
    const scope = 'global';
    return this.cache.getOrSetVersioned(
      scope,
      ['certifications', 'detail', certificationId],
      async () => {
        const [certification] = await this.db
          .select()
          .from(this.table)
          .where(eq(this.table.id, certificationId))
          .execute();

        if (!certification) {
          return {};
        }
        return certification;
      },
      { tags: this.tags(scope) },
    );
  }

  async update(
    certificationId: string,
    dto: UpdateCertificationDto,
    userId: string,
    ip: string,
  ) {
    // Check if record exists
    const [certification] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, certificationId))
      .execute();

    if (!certification) {
      throw new NotFoundException(
        `Profile for employee ${certificationId} not found`,
      );
    }

    const [updated] = await this.db
      .update(this.table)
      .set({ ...dto })
      .where(eq(this.table.id, certificationId))
      .returning()
      .execute();

    const changes: Record<string, any> = {};
    for (const key of Object.keys(dto)) {
      const before = (certification as any)[key];
      const after = (dto as any)[key];
      if (before !== after) {
        changes[key] = { before, after };
      }
    }
    if (Object.keys(changes).length) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'Employee certification',
        details: 'Updated employee certification',
        userId,
        entityId: certificationId,
        ipAddress: ip,
        changes,
      });
    }

    // Invalidate caches: employee scope (by employeeId) + global detail entry
    await this.cache.bumpCompanyVersion(certification.employeeId);
    await this.cache.bumpCompanyVersion('global');

    return updated;
  }

  async remove(certificationId: string) {
    // select first to know employeeId for cache invalidation (or use RETURNING *)
    const [existing] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, certificationId))
      .execute();

    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, certificationId))
      .returning({ id: this.table.id })
      .execute();

    if (!result.length) {
      throw new NotFoundException(
        `Profile for employee ${certificationId} not found`,
      );
    }

    // Invalidate caches
    if (existing?.employeeId) {
      await this.cache.bumpCompanyVersion(existing.employeeId);
    }
    await this.cache.bumpCompanyVersion('global');

    return { deleted: true, id: result[0].id };
  }
}
