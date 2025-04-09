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
import { AuditService } from 'src/audit/audit.service';
import { JwtType } from '../types/user.type';
import { employees } from 'src/drizzle/schema/employee.schema';
import { companies } from 'src/drizzle/schema/company.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenGeneratorService: TokenGeneratorService,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  async login(payload: LoginDto, response: Response) {
    const user = await this.validateUser(payload.email, payload.password);
    // Update last login
    const updatedUser = await this.db
      .update(users)
      .set({ last_login: new Date() })
      .where(eq(users.email, payload.email.toLowerCase()))
      .returning({
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
        company_id: users.company_id,
      })
      .execute();

    if (
      user.role !== 'super_admin' &&
      user.role !== 'admin' &&
      user.role !== 'hr_manager'
    ) {
      throw new BadRequestException('Invalid credentials');
    }

    // Log the login event
    await this.auditService.logAction('Login', 'Authentication', user.id);

    // Generate token
    const { accessToken, refreshToken } =
      await this.tokenGeneratorService.generateToken(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, last_login, role, created_at, ...userWithoutPassword } =
      user; // Remove password from user object

    try {
      if (userWithoutPassword) {
        const EXPIRE_TIME = 1000 * 60 * 60 * 24; // 1 day
        // Send the JSON response with a success message
        response.json({
          success: true,
          message: 'Login successful',
          user: updatedUser[0],
          backendTokens: {
            accessToken,
            refreshToken,
            expiresIn: new Date().setTime(new Date().getTime() + EXPIRE_TIME),
          },
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

  async employeeLogin(payload: LoginDto, response: Response) {
    const user = await this.validateUser(payload.email, payload.password);
    // Update last login
    await this.db
      .update(users)
      .set({ last_login: new Date() })
      .where(eq(users.email, payload.email.toLowerCase()))
      .returning({
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
        company_id: users.company_id,
      })
      .execute();

    if (user.role !== 'employee') {
      throw new BadRequestException('Invalid credentials');
    }

    // Log the login event
    await this.auditService.logAction('Login', 'Authentication', user.id);

    // Generate token
    const { accessToken, refreshToken } =
      await this.tokenGeneratorService.generateToken(user);

    const employee = await this.db
      .select({
        id: employees.id,
        first_name: employees.first_name,
        last_name: employees.last_name,
        email: users.email,
        company_id: companies.id,
        company_name: companies.name,
        job_title: employees.job_title,
        annual_gross: employees.annual_gross,
        group_id: employees.group_id,
        apply_nhf: employees.apply_nhf,
        avatar: users.avatar,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.user_id))
      .innerJoin(companies, eq(companies.id, employees.company_id))
      .where(eq(employees.user_id, user.id));

    try {
      if (employee) {
        const EXPIRE_TIME = 1000 * 60 * 60 * 24; // 1 day
        // Send the JSON response with a success message
        response.json({
          success: true,
          message: 'Login successful',
          user: employee[0],
          backendTokens: {
            accessToken,
            refreshToken,
            expiresIn: new Date().setTime(new Date().getTime() + EXPIRE_TIME),
          },
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

  async refreshToken(user: JwtType) {
    const payload = {
      email: user.email,
      sub: user.sub,
    };

    // Update last login
    const EXPIRE_TIME = 1000 * 60 * 60 * 24; // 1 day

    // Get Tokens
    const { accessToken, refreshToken } =
      await this.tokenGeneratorService.generateToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: new Date().setTime(new Date().getTime() + EXPIRE_TIME),
    };
  }

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

  async logout(response: Response) {
    response.clearCookie('Authentication', {
      httpOnly: true,
      secure: true, // Required for HTTPS
      sameSite: 'none',
    });
    response.json({
      success: true,
      message: 'Logout successful',
    });
  }
}
