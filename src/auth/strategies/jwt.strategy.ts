import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { db } from '../../drizzle/types/drizzle';
import { users } from '../../drizzle/schema/users.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    console.log('JWT_SECRET', secret);
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
        role: users.role,
        last_login: users.last_login,
        firstName: users.first_name,
        lastName: users.last_name,
        company_id: users.company_id,
      })
      .from(users)
      .where(eq(users.email, payload.email)); // Filtering by email as provided in payload

    const user = usersArray[0];

    if (!user) {
      return new UnauthorizedException('Invalid token or user does not exist');
    }

    return user;
  }
}
