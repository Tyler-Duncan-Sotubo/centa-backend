import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// DTO for creating a new department
export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Name of the department (e.g., "Human Resources")

  @IsString()
  @IsOptional()
  head_of_department: string; // ID of the department head
}
