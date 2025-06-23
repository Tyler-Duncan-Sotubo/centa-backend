import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import {
  UserService,
  TokenGeneratorService,
  AuthService,
  VerificationService,
  PasswordResetService,
} from './services';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrimaryGuard } from './guards/primary.guard';
import { AwsService } from 'src/common/aws/aws.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { LoginVerificationService } from './services/login-verification.service';
import { PermissionsModule } from './permissions/permissions.module';
import { PermissionsService } from './permissions/permissions.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'permission-seed-queue',
    }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_EXPIRATION')}s`,
        },
      }),
      inject: [ConfigService],
    }),
    PermissionsModule,
  ],
  controllers: [AuthController],
  providers: [
    UserService,
    TokenGeneratorService,
    AuthService,
    JwtStrategy,
    VerificationService,
    PasswordResetService,
    PrimaryGuard,
    ConfigService,
    AwsService,
    AuditService,
    LoginVerificationService,
    PermissionsService,
  ],
  exports: [
    UserService,
    TokenGeneratorService,
    AuthService,
    JwtStrategy,
    VerificationService,
    PasswordResetService,
    PrimaryGuard,
    PermissionsService,
  ],
})
export class AuthModule {}
