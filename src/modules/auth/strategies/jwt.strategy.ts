import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { companyRoles, users } from '../schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) =>
          request?.cookies?.Authentication ||
          request?.Authentication ||
          request?.headers.Authentication,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const usersArray = await this.db
      .select({
        email: users.email,
        id: users.id,
        role: companyRoles.name,
        last_login: users.lastLogin,
        firstName: users.firstName,
        lastName: users.lastName,
        company_id: users.companyId,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.email, payload.email)); // Filtering by email as provided in payload

    const user = usersArray[0];

    if (!user) {
      return new UnauthorizedException('Invalid token or user does not exist');
    }

    return user;
  }
}
