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
exports.DemoDataService = void 0;
const common_1 = require("@nestjs/common");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const department_schema_1 = require("../../drizzle/schema/department.schema");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const faker_1 = require("@faker-js/faker");
let DemoDataService = class DemoDataService {
    constructor(db) {
        this.db = db;
        this.generateEmployee = () => {
            const firstName = faker_1.faker.person.firstName();
            const lastName = faker_1.faker.person.lastName();
            const fullName = `${firstName} ${lastName}`;
            const phone = faker_1.faker.phone.number({
                style: 'international',
            });
            const email = faker_1.faker.internet.email();
            const startDate = faker_1.faker.date.past();
            const annualGross = faker_1.faker.number.int({ min: 3000000, max: 3500000 });
            const bonus = faker_1.faker.number.int({ min: 5000, max: 15000 });
            const commission = faker_1.faker.number.int({ min: 3000, max: 7000 });
            return {
                employee_number: faker_1.faker.number.int({ min: 1, max: 10000 }),
                first_name: firstName,
                last_name: lastName,
                name: fullName,
                job_title: faker_1.faker.person.jobTitle(),
                phone: phone,
                email: email,
                employment_status: 'active',
                start_date: startDate.toISOString().split('T')[0],
                annual_gross: annualGross,
                bonus: bonus,
                commission: commission,
            };
        };
        this.groupData = [
            {
                name: 'Permanent Staff',
                apply_paye: true,
                apply_pension: true,
                apply_nhf: false,
                apply_additional: true,
            },
            {
                name: 'Contract Staff',
                apply_paye: true,
                apply_pension: false,
                apply_nhf: true,
                apply_additional: false,
            },
            {
                name: 'Interns',
                apply_paye: false,
                apply_pension: false,
                apply_nhf: false,
                apply_additional: false,
            },
        ];
        this.departmentData = [
            { name: 'Human Resources' },
            { name: 'Information Technology' },
            { name: 'Finance' },
        ];
    }
    async seedDemoData(user_id, company_id) {
        const employeeData = faker_1.faker.helpers.multiple(this.generateEmployee, {
            count: 4,
        });
        const savedEmployees = await this.db
            .insert(employee_schema_1.employees)
            .values(employeeData.map((employee) => ({
            ...employee,
            user_id,
            company_id,
            is_demo: true,
        })))
            .returning({ id: employee_schema_1.employees.id })
            .execute();
        const employeeIds = savedEmployees.map((emp) => emp.id);
        const getRandomId = () => employeeIds[Math.floor(Math.random() * employeeIds.length)];
        await this.db
            .insert(department_schema_1.departments)
            .values(this.departmentData.map((department) => ({
            name: department.name,
            company_id,
            head_of_department: getRandomId(),
            is_demo: true,
        })))
            .execute();
        await this.db
            .insert(employee_schema_1.employee_groups)
            .values(this.groupData.map((group) => ({
            ...group,
            company_id,
            is_demo: true,
        })))
            .execute();
    }
};
exports.DemoDataService = DemoDataService;
exports.DemoDataService = DemoDataService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], DemoDataService);
//# sourceMappingURL=demo-data.service.js.map