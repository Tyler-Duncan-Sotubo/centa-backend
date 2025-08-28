// notifications/dto/register-device.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  expoPushToken!: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'unknown'])
  platform?: 'ios' | 'android' | 'unknown';

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}
