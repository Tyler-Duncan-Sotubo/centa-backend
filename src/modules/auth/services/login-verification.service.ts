// verification.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { EmailVerificationService } from 'src/modules/notification/services/email-verification.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoginVerificationService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateVerificationToken(
    userId: string,
    tempToken?: string,
  ): Promise<string> {
    if (tempToken) {
      const payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      userId = payload.sub;
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 1000 * 60 * 10); // valid for 10 mins

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    await this.db
      .update(users)
      .set({
        verificationCode: token,
        verificationCodeExpiresAt: expires_at,
      })
      .where(eq(users.id, user.id))
      .execute();

    await this.emailVerificationService.sendVerifyLogin(user.email, token); // checking

    return token;
  }

  async regenerateVerificationToken(tempToken: string): Promise<string> {
    const payload = await this.jwtService.verifyAsync(tempToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 1000 * 60 * 10); // valid for 10 mins

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub));

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    await this.db
      .update(users)
      .set({
        verificationCode: token,
        verificationCodeExpiresAt: expires_at,
      })
      .where(eq(users.id, user.id))
      .execute();

    await this.emailVerificationService.sendVerifyLogin(user.email, token); // checking

    return token;
  }
}
