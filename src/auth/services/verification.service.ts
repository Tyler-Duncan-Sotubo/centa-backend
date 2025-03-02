// verification.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from '../../drizzle/types/drizzle';
import { verificationToken } from '../../drizzle/schema/schema';
import { users } from '../../drizzle/schema/schema';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { TokenDto } from '../dto';
import { EmailVerificationService } from 'src/notification/services/email-verification.service';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Generates a verification token for a user
   *
   * The generateVerificationToken method takes a user ID as an argument
   * and returns a verification token.The method first generates a random
   * token using the crypto module.The method then sets the expiration time to
   * 24 hours from the current time and saves the token in the database.
   *
   * @param userId The user ID for which the token is generated for verification purposes
   * @returns {Promise<string>} The verification token
   *
   */
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

  /**
   * Verifies a verification token
   *
   * The verifyToken method takes a token as an argument and verifies the token.
   * The method first checks if the token exists in the database.
   * If the token does not exist, the method throws an exception.
   * If the token has already been used, the method throws an exception.
   * If the token has expired, the method throws an exception.
   * If the token is valid, the method marks the token as used in the database.
   *
   * @param token The verification token to be verified for a user ID and expiration time check
   * @returns {Promise<object>} The result of the verification process (success or failure)
   * as an object with a success property
   *
   */

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
      .set({ is_verified: true })
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
