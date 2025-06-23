import { IsString, IsNotEmpty, IsEmail, IsUUID } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  companyRoleId: string;
}
