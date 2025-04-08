import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { db } from '../../drizzle/types/drizzle';
import { users } from '../../drizzle/schema/users.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class PrimaryGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.validate(payload);

      request['user'] = user;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async validate(payload: { sub: number; email: string }) {
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
