import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import {
  UserService,
  TokenGeneratorService,
  AuthService,
  VerificationService,
  PasswordResetService,
  DemoDataService,
} from './services';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { JwtGuard } from './guards/jwt.guard';
import { EmailVerificationService } from 'src/notification/services/email-verification.service';
import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';
import { InvitationService } from 'src/notification/services/invitation.service';
import { AwsService } from 'src/config/aws/aws.service';

@Module({
  imports: [
    DrizzleModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_EXPIRATION')}s`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    UserService,
    TokenGeneratorService,
    AuthService,
    JwtStrategy,
    VerificationService,
    PasswordResetService,
    EmailVerificationService,
    InvitationService,
    JwtGuard,
    PasswordResetEmailService,
    DemoDataService,
    ConfigService,
    AwsService,
  ],
})
export class AuthModule {}
