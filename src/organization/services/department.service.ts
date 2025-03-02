import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { companies } from '../../drizzle/schema/company.schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { departments } from '../../drizzle/schema/department.schema';
import { employees } from '../../drizzle/schema/employee.schema';
import { CreateDepartmentDto } from '../dto';
import { validate as validateUUID } from 'uuid';
import { CacheService } from 'src/config/cache/cache.service';

@Injectable()
export class DepartmentService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
  ) {}

  async validateCompany(company_id: string) {
    // Check if company_id is a valid UUID
    if (!validateUUID(company_id)) {
      throw new BadRequestException(
        'Invalid company ID format. Expected a UUID.',
      );
    }

    const company = await this.db
      .select({
        id: companies.id,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    if (company.length === 0) {
      throw new NotFoundException('Company not found');
    }

    return company[0];
  }

  async getDepartments(company_id: string) {
    const company = await this.db
      .select({
        id: companies.id,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    if (company.length === 0) {
      throw new BadRequestException('Company not found');
    }
    const result = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        head: sql`${employees.first_name} || ' ' || ${employees.last_name}`.as(
          'employee',
        ),
        heads_email: employees.email,
        created_at: departments.created_at,
      })
      .from(departments)
      .leftJoin(employees, eq(employees.id, departments.head_of_department))
      .where(eq(departments.company_id, company_id))
      .execute();

    if (result.length === 0) {
      throw new BadRequestException('Department not found');
    }

    return result;
  }

  async getDepartmentById(department_id: string) {
    const cacheKey = `department:${department_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const result = await this.db
        .select({
          id: departments.id,
          name: departments.name,
        })
        .from(departments)
        .where(eq(departments.id, department_id))
        .execute();

      if (result.length === 0) {
        throw new NotFoundException('Department not found');
      }

      return result[0];
    });
  }

  async createDepartment(dto: CreateDepartmentDto, user_id: string) {
    const company = await this.validateCompany(user_id); // Validate if the company exists

    try {
      const department = await this.db
        .insert(departments)
        .values({
          name: dto.name,
          head_of_department: dto.head_of_department,
          company_id: company.id,
        })
        .returning({
          id: departments.id,
          name: departments.name,
        })
        .execute();

      return department;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateDepartment(dto: CreateDepartmentDto, department_id: string) {
    await this.getDepartmentById(department_id);
    try {
      const department = await this.db
        .update(departments)
        .set({
          name: dto.name,
          head_of_department: dto.head_of_department,
        })
        .where(eq(departments.id, department_id))
        .returning({
          id: departments.id,
          name: departments.name,
        })
        .execute();

      return department;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteDepartment(department_id: string) {
    await this.getDepartmentById(department_id);
    try {
      await this.db
        .delete(departments)
        .where(eq(departments.id, department_id))
        .execute();

      return 'Department deleted successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // add employee to department
  async addEmployeesToDepartment(
    employeeIds: string | string[], // Accepts a single ID or an array of IDs
    department_id: string,
  ) {
    // Normalize to an array in case a single employee ID is provided
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds];

    // Validate department existence
    await this.getDepartmentById(department_id);

    // Validate employee IDs are in UUID format
    const invalidIds = ids.filter((id) => !validateUUID(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Invalid employee ID format. Expected a UUID.',
      );
    }

    // Fetch all employees by their IDs
    const employeesFound = await this.db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(inArray(employees.id, ids))
      .execute();

    // Identify missing employees
    const foundEmployeeIds = employeesFound.map((emp) => emp.id);
    const missingEmployeeIds = ids.filter(
      (id) => !foundEmployeeIds.includes(id),
    );

    if (missingEmployeeIds.length > 0) {
      throw new NotFoundException(
        `Employees not found: ${missingEmployeeIds.join(', ')}`,
      );
    }

    // Update department for all found employees
    try {
      await this.db
        .update(employees)
        .set({ department_id: department_id })
        .where(inArray(employees.id, foundEmployeeIds))
        .execute();

      return {
        message: 'Employees added to department successfully',
        addedEmployeeIds: foundEmployeeIds,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // remove employee from department
  async removeEmployeeFromDepartment(employee_id: string) {
    // Check if employee_id is a valid UUID
    if (!validateUUID(employee_id)) {
      throw new BadRequestException(
        'Invalid employee ID format. Expected a UUID.',
      );
    }

    // Check if employee is valid
    const employee = await this.db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    if (employee.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    // remove employee from department
    try {
      await this.db
        .update(employees)
        .set({
          department_id: null,
        })
        .where(eq(employees.id, employee_id))
        .execute();

      return 'Employee removed from department successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
