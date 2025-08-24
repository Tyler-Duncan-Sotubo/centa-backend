import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq } from 'drizzle-orm';
import { employeeCertifications } from '../schema/certifications.schema';

@Injectable()
export class CertificationsService {
  protected table = employeeCertifications;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
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

    return created;
  }

  // READ (cached per employee)
  async findAll(employeeId: string) {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();
    return rows;
  }

  // READ (cached per employee + cert id)
  async findOne(certificationId: string) {
    const [certification] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, certificationId))
      .execute();

    if (!certification) {
      return {};
    }
    return certification;
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

    return updated;
  }

  async remove(certificationId: string) {
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

    return { deleted: true, id: result[0].id };
  }
}
