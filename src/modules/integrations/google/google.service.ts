import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { googleAccounts } from './schema/google.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';

@Injectable()
export class GoogleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(createGoogleDto: CreateGoogleDto, user: User) {
    const { id: userId, companyId } = user;

    const existing = await this.db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.companyId, companyId));

    if (existing.length > 0) {
      // Update existing record
      const updated = await this.db
        .update(googleAccounts)
        .set({
          accessToken: createGoogleDto.accessToken,
          refreshToken: createGoogleDto.refreshToken,
          tokenType: createGoogleDto.tokenType,
          scope: createGoogleDto.scope,
          expiryDate: createGoogleDto.expiryDate,
          refreshTokenExpiry: createGoogleDto.refreshTokenExpiry,
          googleEmail: createGoogleDto.googleEmail,
          updatedAt: new Date(),
        })
        .where(eq(googleAccounts.companyId, companyId))
        .returning();

      // Log the update action
      await this.auditService.logAction({
        action: 'update',
        entity: 'google_integration',
        entityId: existing[0].id,
        details: `Updated Google integration for company #${companyId}`,
        userId,
        changes: {
          ...createGoogleDto,
          updatedAt: new Date(),
        },
      });

      return updated[0];
    } else {
      // Insert new record
      const inserted = await this.db
        .insert(googleAccounts)
        .values({
          ...createGoogleDto,
          companyId,
        })
        .returning();

      // Log the update action
      await this.auditService.logAction({
        action: 'create',
        entity: 'google_integration',
        entityId: inserted[0].id,
        details: `Created Google integration for company #${companyId}`,
        userId,
        changes: {
          ...createGoogleDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return inserted[0];
    }
  }

  async findOne(companyId: string) {
    const result = await this.db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.companyId, companyId));

    if (!result.length) {
      throw new NotFoundException(
        `Google integration for company #${companyId} not found`,
      );
    }

    return result[0];
  }

  async update(companyId: string, updateGoogleDto: UpdateGoogleDto) {
    const result = await this.db
      .update(googleAccounts)
      .set({
        ...updateGoogleDto,
        updatedAt: new Date(),
      })
      .where(eq(googleAccounts.companyId, companyId))
      .returning();

    if (!result.length) {
      throw new NotFoundException(
        `Google integration for company #${companyId} not found`,
      );
    }

    return result[0];
  }
}
