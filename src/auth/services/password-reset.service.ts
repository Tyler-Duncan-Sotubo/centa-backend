// password-reset.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from '../../drizzle/types/drizzle';
import { PasswordResetToken, users } from '../../drizzle/schema/schema';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly passwordResetEmailService: PasswordResetEmailService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  /**
   *
   * Handles the generation of a password reset token for a user
   *
   * The generatePasswordResetToken method takes an email as an argument and returns a password reset token.
   * The method first checks if a user with the given email exists.
   * If the user does not exist, the method throws an exception.
   * The method then checks if there is an existing password reset token for the user that has not expired.
   * If there is an existing token, the method returns the token.
   * If there is no existing token, the method generates a new token,
   * sets the expiration time to 1 hour from the current time, and saves the token in the database.
   *
   * @param email  The user's email address for which the token is generated for password reset
   * @returns {Promise<string>}  The password reset token for the user
   */

  async generatePasswordResetToken(email: string): Promise<string> {
    const token = this.jwtService.sign({
      email,
    });
    const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);

    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user || user.length === 0) {
      throw new BadRequestException('User does not exist.');
    }

    const inviteLink = `${this.configService.get(
      'CLIENT_URL',
    )}/auth/reset-password/${token}`;

    await this.passwordResetEmailService.sendPasswordResetEmail(
      email,
      user[0].first_name || 'User',
      inviteLink,
    );

    await this.db
      .insert(PasswordResetToken)
      .values({
        user_id: user[0].id,
        token,
        expires_at,
        is_used: false,
      })
      .execute();

    return token;
  }

  /**
   * Handles the resetting of a user's password
   *
   * The resetPassword method takes a token and a new password as arguments and resets the user's password.
   * The method first checks if the token is valid.
   * If the token is not valid, the method throws an exception.
   * If the token has already been used, the method throws an exception.
   * If the token has expired, the method throws an exception.
   * If the token is valid, the method retrieves the user's email from the token,
   * updates the user's password in the database, marks the token as used, and returns the user's email.
   *
   * @param token  The password reset token
   * @param password  The new password
   * @returns {Promise<string{}>}  The user's email
   */

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const existingToken = await this.db
      .select()
      .from(PasswordResetToken)
      .where(eq(PasswordResetToken.token, token));

    if (existingToken.length === 0) {
      throw new BadRequestException('Token is not valid.');
    }

    if (existingToken[0].is_used) {
      throw new BadRequestException('Token has already been used.');
    }

    if (existingToken[0].expires_at < new Date()) {
      throw new BadRequestException('Token has expired.');
    }

    const decoded = await this.jwtService.verify(token);
    const { email } = decoded;

    if (!email) {
      throw new BadRequestException('User does not exist.');
    }

    await this.db
      .update(users)
      .set({
        password: await bcrypt.hash(password, 10),
      })
      .where(eq(users.email, email))
      .execute();

    await this.db
      .update(PasswordResetToken)
      .set({ is_used: true })
      .where(eq(PasswordResetToken.token, token))
      .execute();

    return {
      message: 'Password reset successful',
    };
  }

  async invitationPasswordReset(token: string, password: string) {
    const decoded = await this.jwtService.verify(token);
    const { email } = decoded;

    if (!email) {
      throw new BadRequestException('User does not exist.');
    }

    await this.db
      .update(users)
      .set({
        password: await bcrypt.hash(password, 10),
      })
      .where(eq(users.email, email))
      .execute();

    return {
      message: 'Password reset successful',
    };
  }
}
