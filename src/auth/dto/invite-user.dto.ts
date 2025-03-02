import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

enum Role {
  ADMIN = 'admin',
  HR_MANAGER = 'hr_manager',
  EMPLOYEE = 'employee',
}

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: Role;
}
