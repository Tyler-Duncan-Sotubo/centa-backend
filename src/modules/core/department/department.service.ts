// src/modules/core/departments/department.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, aliasedTable, inArray, sql } from 'drizzle-orm';
import { AssignCostCenterDto } from './dto/assign-cost-center.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { costCenters, departments, employees, users } from 'src/drizzle/schema';

type DeptWithRelations = {
  id: string;
  name: string;
  description: string | null;
  head?: { id: string; firstName: string; lastName: string } | null;
  parent?: { id: string; name: string } | null;
  costCenter?: {
    id: string;
    code: string;
    name: string;
    budget: number;
  } | null;
};

@Injectable()
export class DepartmentService extends BaseCrudService<
  UpdateDepartmentDto & {
    parentDepartmentId?: string;
    headId?: string;
    costCenterId?: string;
  },
  typeof departments
> {
  protected table = departments;

  constructor(
    @Inject(DRIZZLE) db: db,
    audit: AuditService,
    private readonly cache: CacheService,
    private readonly companySettings: CompanySettingsService,
  ) {
    super(db, audit);
  }

  async create(companyId: string, dto: CreateDepartmentDto) {
    // 1) Check if department already exists
    const existing = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.name, dto.name),
          eq(departments.companyId, companyId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException(
        `Department with name ${dto.name} already exists`,
      );
    }

    const [dept] = await this.db
      .insert(departments)
      .values({
        name: dto.name,
        description: dto.description,
        companyId,
        parentDepartmentId: dto.parentDepartmentId,
        costCenterId: dto.costCenterId,
        headId: dto.headId,
      })
      .returning({
        id: departments.id,
        name: departments.name,
        description: departments.description,
      })
      .execute();

    // make onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_departments',
      true,
    );

    return dept;
  }

  async bulkCreate(companyId: string, rows: any[]) {
    // 1) Check for duplicates
    const names = rows.map((r) => r['Name'] ?? r['name']);
    const duplicates = await this.db
      .select({ name: departments.name })
      .from(departments)
      .where(
        and(
          eq(departments.companyId, companyId),
          inArray(departments.name, names),
        ),
      )
      .execute();

    if (duplicates.length) {
      const duplicateNames = duplicates.map((d) => d.name);
      throw new BadRequestException(
        `Department names already exist: ${duplicateNames.join(', ')}`,
      );
    }

    // 1) Map & validate
    const dtos: CreateDepartmentDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateDepartmentDto, {
        name: row['Name'] ?? row['name'],
        description: row['Description'] ?? row['description'],
        parentDepartmentId: row['ParentDepartmentId']
          ? row['ParentDepartmentId']
          : undefined,
        costCenterId: row['CostCenterId'] ? row['CostCenterId'] : undefined,
      });
      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(
          'Invalid data in bulk upload: ' + JSON.stringify(errors),
        );
      }
      dtos.push(dto);
    }

    // 2) Insert all in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        name: d.name,
        description: d.description,
        parentDepartmentId: d.parentDepartmentId,
        costCenterId: d.costCenterId,
      }));

      const result = await trx
        .insert(departments)
        .values(values)
        .returning({
          id: departments.id,
          name: departments.name,
          description: departments.description,
        })
        .execute();

      return result;
    });

    await this.companySettings.setSetting(
      companyId,
      'onboarding_departments',
      true,
    );

    return inserted;
  }

  async findAll(companyId: string) {
    const cacheKey = `departments:${companyId}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      // 1. Get all departments with head info
      const allDepartments = await this.db
        .select({
          id: departments.id,
          name: departments.name,
          description: departments.description,
          createdAt: departments.createdAt,
          head: {
            id: employees.id,
            name: sql`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            email: employees.email,
            avatarUrl: users.avatar,
          },
        })
        .from(departments)
        .leftJoin(employees, eq(employees.id, departments.headId))
        .leftJoin(users, eq(users.id, employees.userId))
        .where(eq(departments.companyId, companyId))
        .execute();

      // 2. Get all employees in these departments
      const allEmployees = await this.db
        .select({
          id: employees.id,
          name: sql`concat(${employees.firstName}, ' ', ${employees.lastName})`,
          email: employees.email,
          departmentId: employees.departmentId,
          avatarUrl: users.avatar,
        })
        .from(employees)
        .leftJoin(users, eq(users.id, employees.userId))
        .where(
          inArray(
            employees.departmentId,
            allDepartments.map((d) => d.id),
          ),
        )
        .execute();

      // 3. Group employees by department
      const deptIdToEmployees = allEmployees.reduce((acc, emp) => {
        if (emp.departmentId !== null && emp.departmentId !== undefined) {
          (acc[emp.departmentId] = acc[emp.departmentId] || []).push(emp);
        }
        return acc;
      }, {});

      // 4. Combine data, fixing head if missing
      return allDepartments.map((dept) => ({
        ...dept,
        head: dept.head && dept.head.id ? dept.head : null, // set to null if no head
        employees: deptIdToEmployees[dept.id] || [],
      }));
    });
  }

  async findOne(companyId: string, id: string) {
    const [dept] = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
      })
      .from(departments)
      .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
      .execute();

    if (!dept) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return dept;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateDepartmentDto,
    userId: string,
    ip: string,
  ) {
    return this.updateWithAudit(
      companyId,
      id,
      {
        name: dto.name,
        description: dto.description,
        parentDepartmentId: dto.parentDepartmentId,
        costCenterId: dto.costCenterId,
        headId: dto.headId,
      },
      {
        entity: 'Department',
        action: 'UpdateDepartment',
        fields: [
          'name',
          'description',
          'parentDepartmentId',
          'costCenterId',
          'headId',
        ],
      },
      userId,
      ip,
    );
  }

  async remove(companyId: string, id: string) {
    const [deleted] = await this.db
      .delete(departments)
      .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
      .returning({ id: departments.id })
      .execute();

    if (!deleted) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return { id: deleted.id };
  }

  async assignHead(
    companyId: string,
    departmentId: string,
    headId: string,
    userId: string,
    ip: string,
  ) {
    // 1) Verify employee exists in this company
    const [emp] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.id, headId), eq(employees.companyId, companyId)))
      .execute();
    if (!emp) {
      throw new BadRequestException(
        `Employee ${headId} not found in this company`,
      );
    }

    // 2) Use updateWithAudit to set headId and log only if changed
    return this.updateWithAudit(
      companyId,
      departmentId,
      { headId },
      {
        entity: 'Department',
        action: 'create',
        fields: ['headId'],
      },
      userId,
      ip,
    );
  }

  async findOneWithHead(companyId: string, id: string) {
    const [dept] = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        head: {
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
        },
      })
      .from(departments)
      .leftJoin(employees, eq(employees.id, departments.headId))
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .execute();

    if (!dept) throw new NotFoundException();
    return dept;
  }

  async assignParent(
    companyId: string,
    departmentId: string,
    dto: AssignParentDto,
    userId: string,
    ip: string,
  ) {
    const parentId = dto.parentDepartmentId;

    // 1) Prevent self-parenting
    if (departmentId === parentId) {
      throw new BadRequestException(`Department cannot be its own parent`);
    }

    // 2) Ensure the new parent exists in this tenant
    const [parent] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(eq(departments.id, parentId), eq(departments.companyId, companyId)),
      )
      .execute();
    if (!parent) {
      throw new NotFoundException(`Parent department ${parentId} not found`);
    }

    // 3) Delegate to the BaseCrudService to update + audit
    return this.updateWithAudit(
      companyId,
      departmentId,
      { parentDepartmentId: parentId },
      {
        entity: 'Department',
        action: 'create',
        fields: ['parentDepartmentId'],
      },
      userId,
      ip,
    );
  }

  // 2) Assign a cost center
  async assignCostCenter(
    companyId: string,
    departmentId: string,
    dto: AssignCostCenterDto,
    userId: string,
    ip: string,
  ) {
    const costCenterId = dto.costCenterId;

    // 1) Ensure cost center exists in this company
    const [cc] = await this.db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, costCenterId),
          eq(costCenters.companyId, companyId),
        ),
      )
      .execute();
    if (!cc) {
      throw new NotFoundException(`Cost center ${costCenterId} not found`);
    }

    // 2) Delegate update + audit to BaseCrudService
    return this.updateWithAudit(
      companyId,
      departmentId,
      { costCenterId },
      {
        entity: 'Department',
        action: 'create',
        fields: ['costCenterId'],
      },
      userId,
      ip,
    );
  }

  private parentDept = aliasedTable(departments, 'parentDept');

  async findOneWithRelations(companyId: string, id: string) {
    const pd = this.parentDept; // local shorthand
    const [dept] = await this.db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        head: {
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
        },
        parent: {
          id: pd.id,
          name: pd.name,
        },
        costCenter: {
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
          budget: costCenters.budget,
        },
      })
      .from(departments)
      // 2) join employees
      .leftJoin(employees, eq(employees.id, departments.headId))
      // 3) join cost centers
      .leftJoin(costCenters, eq(costCenters.id, departments.costCenterId))
      // 4) join the alias for parent lookup
      .leftJoin(pd, eq(pd.id, departments.parentDepartmentId))
      // 5) filter by company + id
      .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
      .execute();

    if (!dept) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return dept;
  }

  async findAllWithRelations(companyId: string) {
    const pd = this.parentDept;
    return (
      this.db
        .select({
          id: departments.id,
          name: departments.name,
          description: departments.description,
          head: {
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
          },
          parent: {
            id: pd.id,
            name: pd.name,
          },
          costCenter: {
            id: costCenters.id,
            code: costCenters.code,
            name: costCenters.name,
            budget: costCenters.budget,
          },
        })
        .from(departments)
        .leftJoin(employees, eq(employees.id, departments.headId))
        .leftJoin(costCenters, eq(costCenters.id, departments.costCenterId))
        // **Don't forget this join**:
        .leftJoin(pd, eq(pd.id, departments.parentDepartmentId))
        .where(eq(departments.companyId, companyId))
        .execute()
    );
  }

  // 5) Build a tree hierarchy in memory
  async getHierarchy(companyId: string) {
    const depts = await this.findAllWithRelations(companyId);

    // index by id
    const map = new Map<string, DeptWithRelations & { children: any[] }>();
    depts.forEach((d: DeptWithRelations) =>
      map.set(d.id, { ...d, children: [] }),
    );

    // assemble tree
    const roots: (DeptWithRelations & { children: any[] })[] = [];
    for (const d of map.values()) {
      if (d.parent?.id && map.has(d.parent.id)) {
        map.get(d.parent.id)!.children.push(d);
      } else {
        roots.push(d);
      }
    }
    return roots;
  }
}
