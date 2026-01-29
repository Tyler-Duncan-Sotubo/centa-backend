// password-reset.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { companyRoles, PasswordResetToken, users } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
// import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordResetEmailService } from 'src/modules/notification/services/password-reset.service';
import { AuditService } from 'src/modules/audit/audit.service';

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly passwordResetEmailService: PasswordResetEmailService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async generatePasswordResetToken(email: string) {
    const token = this.jwtService.sign({
      email,
    });
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: companyRoles.name,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))

      .where(eq(users.email, email));

    if (!user || user.length === 0) {
      throw new BadRequestException('User does not exist.');
    }

    let inviteLink = '';

    if (user[0].role === 'employee') {
      inviteLink = `${this.configService.get(
        'EMPLOYEE_PORTAL_URL',
      )}/reset-password/${token}`;
    } else {
      inviteLink = `${this.configService.get(
        'CLIENT_URL',
      )}/reset-password/${token}`;
    }

    await this.passwordResetEmailService.sendPasswordResetEmail(
      email,
      user[0].firstName || 'User',
      inviteLink,
    );

    const existingToken = await this.db
      .select()
      .from(PasswordResetToken)
      .where(eq(PasswordResetToken.user_id, user[0].id));

    if (existingToken.length > 0) {
      await this.db
        .update(PasswordResetToken)
        .set({
          token,
          expires_at,
          is_used: false,
        })
        .where(eq(PasswordResetToken.user_id, user[0].id))
        .execute();
    } else {
      await this.db
        .insert(PasswordResetToken)
        .values({
          user_id: user[0].id,
          token,
          expires_at,
          is_used: false,
        })
        .execute();
    }

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
    ip: string,
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

    // Log Password Reset
    await this.auditService.logAction({
      action: 'Password Reset',
      entity: 'Authentication',
      userId: existingToken[0].user_id,
      details: 'User password reset successfully',
      ipAddress: ip,
    });

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
