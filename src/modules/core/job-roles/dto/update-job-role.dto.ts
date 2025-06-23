import { PartialType } from '@nestjs/mapped-types';
import { CreateJobRoleDto } from './create-job-role.dto';

export class UpdateJobRoleDto extends PartialType(CreateJobRoleDto) {}
