import { IsOptional, IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class CreateClockInOutDto {
  @IsString()
  @IsNotEmpty()
  latitude: string;

  @IsString()
  @IsNotEmpty()
  longitude: string;

  @IsOptional()
  @IsBoolean()
  forceClockIn?: boolean;
}
