// notifications/dto/send-to-employee.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class SendToEmployeeDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsString()
  type!: string;

  @IsOptional()
  route?: string;

  @IsOptional()
  url?: string;

  @IsOptional()
  data?: Record<string, any>;
}
