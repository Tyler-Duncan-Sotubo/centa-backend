import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenGeneratorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generates an access token and a refresh token for a given user.
   *
   * @param user - The user object containing user details.
   * @returns An object containing the generated access token and refresh token.
   *
   * @remarks
   * - The access token is generated with a short expiration time (e.g., 1 hour).
   * - The refresh token is generated with a longer expiration time (e.g., 7 days).
   * - Both tokens are signed using the JWT secret from the configuration service.
   */

  async generateToken(user: any) {
    // Get payload from user
    const payload = { sub: user.id, email: user.email };

    // Generate Access Token (short expiration)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: `${this.configService.get<number>('JWT_EXPIRATION')}s`, // Access token expires quickly (e.g., 1 hour)
    });

    // Generate Refresh Token (longer expiration)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'), // Use a different secret for refresh token
      expiresIn: `${this.configService.get<number>('JWT_REFRESH_EXPIRATION')}s`, // Refresh token expires longer (e.g., 7 days)
    });

    return { accessToken, refreshToken };
  }

  async generateTempToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'), // Use a different secret for refresh token
      expiresIn: `60m`,
    });
  }
}
