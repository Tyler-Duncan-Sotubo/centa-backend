import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { googleAccounts } from './schema/google.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service'; // adjust path if needed

@Injectable()
export class GoogleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 60; // cache Google integration reads for 1 hour
  private tags(companyId: string) {
    return [
      `company:${companyId}:integrations`,
      `company:${companyId}:integrations:google`,
    ];
  }

  async create(createGoogleDto: CreateGoogleDto, user: User) {
    const { id: userId, companyId } = user;

    const existing = await this.db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.companyId, companyId))
      .execute();

    if (existing.length > 0) {
      const [updated] = await this.db
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
        .returning()
        .execute();

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

      // invalidate versioned caches
      await this.cache.bumpCompanyVersion(companyId);

      return updated;
    } else {
      const [inserted] = await this.db
        .insert(googleAccounts)
        .values({
          ...createGoogleDto,
          companyId,
        })
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'create',
        entity: 'google_integration',
        entityId: inserted.id,
        details: `Created Google integration for company #${companyId}`,
        userId,
        changes: {
          ...createGoogleDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // invalidate versioned caches
      await this.cache.bumpCompanyVersion(companyId);

      return inserted;
    }
  }

  async findOne(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['integrations', 'google', 'account'],
      async () => {
        const result = await this.db
          .select()
          .from(googleAccounts)
          .where(eq(googleAccounts.companyId, companyId))
          .execute();

        if (!result.length) {
          throw new NotFoundException(
            `Google integration for company #${companyId} not found`,
          );
        }

        return result[0];
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async update(user: User, updateGoogleDto: UpdateGoogleDto) {
    const { companyId, id: userId } = user;
    const [updated] = await this.db
      .update(googleAccounts)
      .set({
        ...updateGoogleDto,
        updatedAt: new Date(),
      })
      .where(eq(googleAccounts.companyId, companyId))
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException(
        `Google integration for company #${companyId} not found`,
      );
    }

    await this.auditService.logAction({
      action: 'update',
      entity: 'google_integration',
      entityId: updated.id,
      details: `Updated Google integration for company #${companyId}`,
      userId: userId,
      changes: {
        ...updateGoogleDto,
        updatedAt: new Date(),
      },
    });

    // invalidate versioned caches
    await this.cache.bumpCompanyVersion(companyId);

    return updated;
  }
}
