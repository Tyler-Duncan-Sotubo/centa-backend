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
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { companyRoles, users } from '../schema';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class PrimaryGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly permissionsService: PermissionsService,
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
        role: companyRoles.name,
        last_login: users.lastLogin,
        firstName: users.firstName,
        lastName: users.lastName,
        companyId: users.companyId,
        roleId: companyRoles.id,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.email, payload.email)); // Filtering by email as provided in payload

    const user = usersArray[0];

    if (!user) {
      return new UnauthorizedException('Invalid token or user does not exist');
    }

    const permissionKeys =
      await this.permissionsService.getPermissionKeysForUser(user.roleId);

    return {
      ...user,
      permissions: permissionKeys,
    };
  }
}
