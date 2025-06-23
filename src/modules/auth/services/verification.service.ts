// verification.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { TokenDto } from '../dto';
import { users, verificationToken } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { EmailVerificationService } from 'src/modules/notification/services/email-verification.service';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async generateVerificationToken(userId: string): Promise<string> {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await this.db.select().from(users).where(eq(users.id, userId));

    if (user.length === 0) {
      throw new BadRequestException('User not found.');
    }

    const existingToken = await this.db
      .select()
      .from(verificationToken)
      .where(eq(verificationToken.user_id, userId));

    if (existingToken.length > 0) {
      await this.db
        .update(verificationToken)
        .set({ token, expires_at, is_used: false })
        .where(eq(verificationToken.user_id, userId))
        .execute();
    } else {
      await this.db
        .insert(verificationToken)
        .values({
          user_id: userId,
          token,
          expires_at,
          is_used: false,
        })
        .execute();
    }

    await this.emailVerificationService.sendVerifyEmail(user[0].email, token);

    return token;
  }

  async verifyToken(dto: TokenDto): Promise<object> {
    const existingToken = await this.db
      .select()
      .from(verificationToken)
      .where(eq(verificationToken.token, dto.token));

    if (existingToken.length === 0) {
      throw new BadRequestException('Token is not valid.');
    }

    if (existingToken[0].is_used) {
      throw new BadRequestException('Token has already been used.');
    }

    if (existingToken[0].expires_at < new Date()) {
      throw new BadRequestException('Token has expired.');
    }

    await this.db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.id, existingToken[0].user_id))
      .execute();

    await this.db
      .update(verificationToken)
      .set({ is_used: true })
      .where(eq(verificationToken.id, existingToken[0].id))
      .execute();

    return {
      success: true,
    };
  }
}
