// auth.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import * as bcrypt from 'bcryptjs';
import { TokenGeneratorService } from './token-generator.service';
import { LoginDto } from '../dto';
import { db } from '../../drizzle/types/drizzle';
import { users } from 'src/drizzle/schema/users.schema';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq } from 'drizzle-orm';
import { Response } from 'express';
import { PasswordResetService } from './password-reset.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenGeneratorService: TokenGeneratorService,
    private readonly passwordResetService: PasswordResetService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  /**
   * Handles the login of a user and returns a JWT token
   *
   * The login method takes a user object as an argument and returns a JWT token.
   * The method first generates a payload object from the user object, which contains the user's ID and email.
   *
   * @param user The user object to be logged in with a JWT token
   * @returns  The JWT token
   */

  async login(payload: LoginDto, response: Response) {
    const user = await this.validateUser(payload.email, payload.password);

    // First login
    let firstLogin = false;

    if (user.role === 'employee' && user.last_login === null) {
      firstLogin = true;
    }

    if (firstLogin) {
      // Send password reset email
      await this.passwordResetService.generatePasswordResetToken(user.email);
    }

    // Update last login
    await this.db
      .update(users)
      .set({ last_login: new Date() })
      .where(eq(users.email, payload.email.toLowerCase()))
      .execute();

    // Generate token
    const { access_token, refresh_token } =
      await this.tokenGeneratorService.generateToken(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, last_login, ...userWithoutPassword } = user; // Remove password from user object

    try {
      if (userWithoutPassword) {
        // Set the refresh token as a cookie (optional)
        response.cookie('Authentication', refresh_token, {
          httpOnly: true,
          secure: false,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          sameSite: 'lax',
        });

        // Set both tokens in the HTTP headers
        response.setHeader('Authorization', `Bearer ${access_token}`);
        response.setHeader('X-Refresh-Token', refresh_token);

        // Send the JSON response with a success message
        response.json({
          success: true,
          message: 'Login successful',
          user: user,
          token: access_token,
        });
      } else {
        throw new BadRequestException('Invalid credentials');
      }
    } catch (error: any) {
      response.json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Validates a user's email and password.
   *
   * @param email - The email address of the user.
   * @param password - The password of the user.
   * @returns The user object if validation is successful.
   * @throws Will throw an error if the user does not exist or if the credentials are incorrect.
   */

  private async validateUser(email: string, password: string) {
    const user = await this.userService.findUserByEmail(email.toLowerCase());

    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return user;
  }
}
