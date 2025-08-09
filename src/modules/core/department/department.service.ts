// src/modules/core/departments/department.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
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
    private readonly logger: PinoLogger,
  ) {
    super(db, audit);
    this.logger.setContext(DepartmentService.name);
  }

  // ------------------------
  // Cache key helpers
  // ------------------------
  private keys(companyId: string) {
    return {
      list: `departments:list:${companyId}`,
      listWithRelations: `departments:relations:list:${companyId}`,
      hierarchy: `departments:hierarchy:${companyId}`,
      one: (id: string) => `departments:one:${companyId}:${id}`,
      oneWithRelations: (id: string) =>
        `departments:relations:one:${companyId}:${id}`,
    };
  }

  private async invalidateCacheKeys(companyId: string, opts?: { id?: string }) {
    const k = this.keys(companyId);
    const keys = [
      k.list,
      k.listWithRelations,
      k.hierarchy,
      opts?.id ? k.one(opts.id) : null,
      opts?.id ? k.oneWithRelations(opts.id) : null,
    ].filter(Boolean) as string[];

    this.logger.debug(
      { companyId, keys, departmentId: opts?.id },
      'cache:invalidate:start',
    );

    await Promise.all(
      keys.map(async (key) => {
        await this.cache.del?.(key);
        await this.cache.del?.(key);
      }),
    );

    this.logger.debug(
      { companyId, departmentId: opts?.id },
      'cache:invalidate:done',
    );
  }

  // ------------------------
  // Mutations
  // ------------------------
  async create(companyId: string, dto: CreateDepartmentDto) {
    this.logger.info({ companyId, dto }, 'departments:create:start');

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
      this.logger.warn(
        { companyId, name: dto.name },
        'departments:create:duplicate-name',
      );
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

    await this.companySettings.setSetting(
      companyId,
      'onboarding_departments',
      true,
    );

    await this.invalidateCacheKeys(companyId);

    this.logger.info(
      { companyId, departmentId: dept.id },
      'departments:create:done',
    );
    return dept;
  }

  async bulkCreate(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rows: rows?.length ?? 0 },
      'departments:bulkCreate:start',
    );

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
      this.logger.warn(
        { companyId, duplicateNames },
        'departments:bulkCreate:duplicates',
      );
      throw new BadRequestException(
        `Department names already exist: ${duplicateNames.join(', ')}`,
      );
    }

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
        this.logger.warn(
          { companyId, errors },
          'departments:bulkCreate:validation-error',
        );
        throw new BadRequestException(
          'Invalid data in bulk upload: ' + JSON.stringify(errors),
        );
      }
      dtos.push(dto);
    }

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

    await this.invalidateCacheKeys(companyId);

    this.logger.info(
      { companyId, created: inserted.length },
      'departments:bulkCreate:done',
    );
    return inserted;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateDepartmentDto,
    userId: string,
    ip: string,
  ) {
    this.logger.info(
      { companyId, departmentId: id, dto, userId, ip },
      'departments:update:start',
    );

    const res = await this.updateWithAudit(
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

    await this.invalidateCacheKeys(companyId, { id });

    this.logger.info(
      { companyId, departmentId: id },
      'departments:update:done',
    );
    return res;
  }

  async remove(companyId: string, id: string) {
    this.logger.info(
      { companyId, departmentId: id },
      'departments:remove:start',
    );

    const [{ empCount }] = await this.db
      .select({
        empCount: sql<number>`CAST(COUNT(*) AS int)`,
      })
      .from(employees)
      .where(
        and(eq(employees.companyId, companyId), eq(employees.departmentId, id)),
      )
      .execute();

    if (empCount > 0) {
      this.logger.warn(
        { companyId, departmentId: id, empCount },
        'departments:remove:blocked:employees',
      );
      throw new BadRequestException(
        `Cannot delete department: ${empCount} employee(s) are assigned to it.`,
      );
    }

    const [{ childCount }] = await this.db
      .select({
        childCount: sql<number>`CAST(COUNT(*) AS int)`,
      })
      .from(departments)
      .where(
        and(
          eq(departments.companyId, companyId),
          eq(departments.parentDepartmentId, id),
        ),
      )
      .execute();

    if (childCount > 0) {
      this.logger.warn(
        { companyId, departmentId: id, childCount },
        'departments:remove:blocked:children',
      );
      throw new BadRequestException(
        `Cannot delete department: ${childCount} sub-department(s) reference it.`,
      );
    }

    const [deleted] = await this.db
      .delete(departments)
      .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
      .returning({ id: departments.id })
      .execute();

    if (!deleted) {
      this.logger.warn(
        { companyId, departmentId: id },
        'departments:remove:not-found',
      );
      throw new NotFoundException(`Department ${id} not found`);
    }

    await this.invalidateCacheKeys(companyId, { id });

    this.logger.info(
      { companyId, departmentId: id },
      'departments:remove:done',
    );
    return { id: deleted.id };
  }

  async assignHead(
    companyId: string,
    departmentId: string,
    headId: string,
    userId: string,
    ip: string,
  ) {
    this.logger.info(
      { companyId, departmentId, headId, userId },
      'departments:assignHead:start',
    );

    const [emp] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.id, headId), eq(employees.companyId, companyId)))
      .execute();
    if (!emp) {
      this.logger.warn(
        { companyId, departmentId, headId },
        'departments:assignHead:employee-not-found',
      );
      throw new BadRequestException(
        `Employee ${headId} not found in this company`,
      );
    }

    const res = await this.updateWithAudit(
      companyId,
      departmentId,
      { headId },
      {
        entity: 'Department',
        action: 'AssignHead',
        fields: ['headId'],
      },
      userId,
      ip,
    );

    await this.invalidateCacheKeys(companyId, { id: departmentId });

    this.logger.info(
      { companyId, departmentId, headId },
      'departments:assignHead:done',
    );
    return res;
  }

  async assignParent(
    companyId: string,
    departmentId: string,
    dto: AssignParentDto,
    userId: string,
    ip: string,
  ) {
    const parentId = dto.parentDepartmentId;
    this.logger.info(
      { companyId, departmentId, parentId, userId },
      'departments:assignParent:start',
    );

    if (departmentId === parentId) {
      this.logger.warn(
        { companyId, departmentId, parentId },
        'departments:assignParent:self-parenting',
      );
      throw new BadRequestException(`Department cannot be its own parent`);
    }

    const [parent] = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(eq(departments.id, parentId), eq(departments.companyId, companyId)),
      )
      .execute();
    if (!parent) {
      this.logger.warn(
        { companyId, departmentId, parentId },
        'departments:assignParent:parent-not-found',
      );
      throw new NotFoundException(`Parent department ${parentId} not found`);
    }

    const res = await this.updateWithAudit(
      companyId,
      departmentId,
      { parentDepartmentId: parentId },
      {
        entity: 'Department',
        action: 'AssignParent',
        fields: ['parentDepartmentId'],
      },
      userId,
      ip,
    );

    await this.invalidateCacheKeys(companyId, { id: departmentId });

    this.logger.info(
      { companyId, departmentId, parentId },
      'departments:assignParent:done',
    );
    return res;
  }

  async assignCostCenter(
    companyId: string,
    departmentId: string,
    dto: AssignCostCenterDto,
    userId: string,
    ip: string,
  ) {
    const costCenterId = dto.costCenterId;
    this.logger.info(
      { companyId, departmentId, costCenterId, userId },
      'departments:assignCostCenter:start',
    );

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
      this.logger.warn(
        { companyId, departmentId, costCenterId },
        'departments:assignCostCenter:cc-not-found',
      );
      throw new NotFoundException(`Cost center ${costCenterId} not found`);
    }

    const res = await this.updateWithAudit(
      companyId,
      departmentId,
      { costCenterId },
      {
        entity: 'Department',
        action: 'AssignCostCenter',
        fields: ['costCenterId'],
      },
      userId,
      ip,
    );

    await this.invalidateCacheKeys(companyId, { id: departmentId });

    this.logger.info(
      { companyId, departmentId, costCenterId },
      'departments:assignCostCenter:done',
    );
    return res;
  }

  // ------------------------
  // Reads (cached)
  // ------------------------

  private parentDept = aliasedTable(departments, 'parentDept');

  async findAll(companyId: string) {
    const cacheKey = this.keys(companyId).list;
    this.logger.debug({ companyId, cacheKey }, 'departments:findAll:start');

    const data = await this.cache.getOrSetCache(cacheKey, async () => {
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

      const deptIdToEmployees = allEmployees.reduce(
        (acc, emp) => {
          if (emp.departmentId !== null && emp.departmentId !== undefined) {
            (acc[emp.departmentId] = acc[emp.departmentId] || []).push(emp);
          }
          return acc;
        },
        {} as Record<string, any[]>,
      );

      return allDepartments.map((dept) => ({
        ...dept,
        head: dept.head && (dept.head as any).id ? dept.head : null,
        employees: deptIdToEmployees[dept.id] || [],
      }));
    });

    this.logger.debug(
      { companyId, count: data.length },
      'departments:findAll:done',
    );
    return data;
  }

  async findOne(companyId: string, id: string) {
    const cacheKey = this.keys(companyId).one(id);
    this.logger.debug(
      { companyId, departmentId: id, cacheKey },
      'departments:findOne:start',
    );

    const dept = await this.cache.getOrSetCache(cacheKey, async () => {
      const [row] = await this.db
        .select({
          id: departments.id,
          name: departments.name,
          description: departments.description,
        })
        .from(departments)
        .where(
          and(eq(departments.companyId, companyId), eq(departments.id, id)),
        )
        .execute();

      if (!row) {
        this.logger.warn(
          { companyId, departmentId: id },
          'departments:findOne:not-found',
        );
        throw new NotFoundException(`Department ${id} not found`);
      }
      return row;
    });

    this.logger.debug(
      { companyId, departmentId: id },
      'departments:findOne:done',
    );
    return dept;
  }

  async findOneWithHead(companyId: string, id: string) {
    const cacheKey = this.keys(companyId).oneWithRelations(id);
    this.logger.debug(
      { companyId, departmentId: id, cacheKey },
      'departments:findOneWithHead:start',
    );

    const dept = await this.cache.getOrSetCache(cacheKey, async () => {
      const [row] = await this.db
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
        .where(
          and(eq(departments.id, id), eq(departments.companyId, companyId)),
        )
        .execute();

      if (!row) {
        this.logger.warn(
          { companyId, departmentId: id },
          'departments:findOneWithHead:not-found',
        );
        throw new NotFoundException();
      }
      return row;
    });

    this.logger.debug(
      { companyId, departmentId: id },
      'departments:findOneWithHead:done',
    );
    return dept;
  }

  async findOneWithRelations(companyId: string, id: string) {
    const cacheKey = this.keys(companyId).oneWithRelations(id);
    const pd = this.parentDept;
    this.logger.debug(
      { companyId, departmentId: id, cacheKey },
      'departments:findOneWithRelations:start',
    );

    const dept = await this.cache.getOrSetCache(cacheKey, async () => {
      const [row] = await this.db
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
        .leftJoin(pd, eq(pd.id, departments.parentDepartmentId))
        .where(
          and(eq(departments.companyId, companyId), eq(departments.id, id)),
        )
        .execute();

      if (!row) {
        this.logger.warn(
          { companyId, departmentId: id },
          'departments:findOneWithRelations:not-found',
        );
        throw new NotFoundException(`Department ${id} not found`);
      }
      return row;
    });

    this.logger.debug(
      { companyId, departmentId: id },
      'departments:findOneWithRelations:done',
    );
    return dept;
  }

  async findAllWithRelations(companyId: string) {
    const cacheKey = this.keys(companyId).listWithRelations;
    const pd = this.parentDept;
    this.logger.debug(
      { companyId, cacheKey },
      'departments:findAllWithRelations:start',
    );

    const rows = await this.cache.getOrSetCache(cacheKey, async () => {
      return this.db
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
        .leftJoin(pd, eq(pd.id, departments.parentDepartmentId))
        .where(eq(departments.companyId, companyId))
        .execute();
    });

    this.logger.debug(
      { companyId, count: rows.length },
      'departments:findAllWithRelations:done',
    );
    return rows;
  }

  async getHierarchy(companyId: string) {
    const cacheKey = this.keys(companyId).hierarchy;
    this.logger.debug(
      { companyId, cacheKey },
      'departments:getHierarchy:start',
    );

    const tree = await this.cache.getOrSetCache(cacheKey, async () => {
      const depts = await this.findAllWithRelations(companyId);

      const map = new Map<string, DeptWithRelations & { children: any[] }>();
      depts.forEach((d: DeptWithRelations) =>
        map.set(d.id, { ...d, children: [] }),
      );

      const roots: (DeptWithRelations & { children: any[] })[] = [];
      for (const d of map.values()) {
        if (d.parent?.id && map.has(d.parent.id)) {
          map.get(d.parent.id)!.children.push(d);
        } else {
          roots.push(d);
        }
      }
      return roots;
    });

    this.logger.debug(
      { companyId, rootCount: tree.length },
      'departments:getHierarchy:done',
    );
    return tree;
  }
}
