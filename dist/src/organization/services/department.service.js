"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentService = void 0;
const common_1 = require("@nestjs/common");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const department_schema_1 = require("../../drizzle/schema/department.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const uuid_1 = require("uuid");
const cache_service_1 = require("../../config/cache/cache.service");
let DepartmentService = class DepartmentService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async validateCompany(company_id) {
        if (!(0, uuid_1.validate)(company_id)) {
            throw new common_1.BadRequestException('Invalid company ID format. Expected a UUID.');
        }
        const company = await this.db
            .select({
            id: company_schema_1.companies.id,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        if (company.length === 0) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company[0];
    }
    async getDepartments(company_id) {
        const company = await this.db
            .select({
            id: company_schema_1.companies.id,
            name: company_schema_1.companies.name,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        if (company.length === 0) {
            throw new common_1.BadRequestException('Company not found');
        }
        const result = await this.db
            .select({
            id: department_schema_1.departments.id,
            name: department_schema_1.departments.name,
            head: (0, drizzle_orm_1.sql) `${employee_schema_1.employees.first_name} || ' ' || ${employee_schema_1.employees.last_name}`.as('employee'),
            heads_email: employee_schema_1.employees.email,
            created_at: department_schema_1.departments.created_at,
        })
            .from(department_schema_1.departments)
            .leftJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(employee_schema_1.employees.id, department_schema_1.departments.head_of_department))
            .where((0, drizzle_orm_1.eq)(department_schema_1.departments.company_id, company_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('Department not found');
        }
        return result;
    }
    async getDepartmentById(department_id) {
        const cacheKey = `department:${department_id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const result = await this.db
                .select({
                id: department_schema_1.departments.id,
                name: department_schema_1.departments.name,
            })
                .from(department_schema_1.departments)
                .where((0, drizzle_orm_1.eq)(department_schema_1.departments.id, department_id))
                .execute();
            if (result.length === 0) {
                throw new common_1.NotFoundException('Department not found');
            }
            return result[0];
        });
    }
    async createDepartment(dto, user_id) {
        const company = await this.validateCompany(user_id);
        try {
            const department = await this.db
                .insert(department_schema_1.departments)
                .values({
                name: dto.name,
                head_of_department: dto.head_of_department,
                company_id: company.id,
            })
                .returning({
                id: department_schema_1.departments.id,
                name: department_schema_1.departments.name,
            })
                .execute();
            return department;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async updateDepartment(dto, department_id) {
        await this.getDepartmentById(department_id);
        try {
            const department = await this.db
                .update(department_schema_1.departments)
                .set({
                name: dto.name,
                head_of_department: dto.head_of_department,
            })
                .where((0, drizzle_orm_1.eq)(department_schema_1.departments.id, department_id))
                .returning({
                id: department_schema_1.departments.id,
                name: department_schema_1.departments.name,
            })
                .execute();
            return department;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async deleteDepartment(department_id) {
        await this.getDepartmentById(department_id);
        try {
            await this.db
                .delete(department_schema_1.departments)
                .where((0, drizzle_orm_1.eq)(department_schema_1.departments.id, department_id))
                .execute();
            return 'Department deleted successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async addEmployeesToDepartment(employeeIds, department_id) {
        const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
        await this.getDepartmentById(department_id);
        const invalidIds = ids.filter((id) => !(0, uuid_1.validate)(id));
        if (invalidIds.length > 0) {
            throw new common_1.BadRequestException('Invalid employee ID format. Expected a UUID.');
        }
        const employeesFound = await this.db
            .select({
            id: employee_schema_1.employees.id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.inArray)(employee_schema_1.employees.id, ids))
            .execute();
        const foundEmployeeIds = employeesFound.map((emp) => emp.id);
        const missingEmployeeIds = ids.filter((id) => !foundEmployeeIds.includes(id));
        if (missingEmployeeIds.length > 0) {
            throw new common_1.NotFoundException(`Employees not found: ${missingEmployeeIds.join(', ')}`);
        }
        try {
            await this.db
                .update(employee_schema_1.employees)
                .set({ department_id: department_id })
                .where((0, drizzle_orm_1.inArray)(employee_schema_1.employees.id, foundEmployeeIds))
                .execute();
            return {
                message: 'Employees added to department successfully',
                addedEmployeeIds: foundEmployeeIds,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async removeEmployeeFromDepartment(employee_id) {
        if (!(0, uuid_1.validate)(employee_id)) {
            throw new common_1.BadRequestException('Invalid employee ID format. Expected a UUID.');
        }
        const employee = await this.db
            .select({
            id: employee_schema_1.employees.id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        if (employee.length === 0) {
            throw new common_1.NotFoundException('Employee not found');
        }
        try {
            await this.db
                .update(employee_schema_1.employees)
                .set({
                department_id: null,
            })
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
                .execute();
            return 'Employee removed from department successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
};
exports.DepartmentService = DepartmentService;
exports.DepartmentService = DepartmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], DepartmentService);
//# sourceMappingURL=department.service.js.map