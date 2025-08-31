// dto/broadcast-app-update.dto.ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class BroadcastAppUpdateDto {
  // message
  @IsString() title!: string;
  @IsString() body!: string;

  @IsOptional() @IsString() url?: string; // store link or deep link
  @IsOptional() @IsString() route?: string; // app route
  @IsOptional() @IsObject() data?: Record<string, any>;

  // options
  @IsOptional() @IsString() companyId?: string; // limit to one company
  @IsOptional()
  @IsArray()
  @IsIn(['ios', 'android'], { each: true })
  platforms?: Array<'ios' | 'android'>;

  @IsOptional() @IsString() minAppVersion?: string; // semver floor
  @IsOptional() @IsBoolean() durable?: boolean; // create inbox rows + badges
}
