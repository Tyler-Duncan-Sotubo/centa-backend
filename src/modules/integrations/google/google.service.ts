import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { googleAccounts } from './schema/google.schema';

@Injectable()
export class GoogleService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async create(createGoogleDto: CreateGoogleDto, userId: string) {
    const existing = await this.db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.userId, userId));

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
        .where(eq(googleAccounts.userId, userId))
        .returning();

      return updated[0];
    } else {
      // Insert new record
      const inserted = await this.db
        .insert(googleAccounts)
        .values({
          ...createGoogleDto,
          userId,
        })
        .returning();

      return inserted[0];
    }
  }

  async findOne(userId: string) {
    const result = await this.db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.userId, userId));

    if (!result.length) {
      throw new NotFoundException(`Google integration #${userId} not found`);
    }

    return result[0];
  }

  async update(userId: string, updateGoogleDto: UpdateGoogleDto) {
    const result = await this.db
      .update(googleAccounts)
      .set({
        ...updateGoogleDto,
        updatedAt: new Date(),
      })
      .where(eq(googleAccounts.userId, userId))
      .returning();

    if (!result.length) {
      throw new NotFoundException(`Google integration #${userId} not found`);
    }

    return result[0];
  }
}
