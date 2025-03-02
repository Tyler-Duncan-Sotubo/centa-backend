// user.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { db } from '../../drizzle/types/drizzle';
import { employees, employee_groups } from 'src/drizzle/schema/employee.schema';
import { departments } from 'src/drizzle/schema/department.schema';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { faker } from '@faker-js/faker';

@Injectable()
export class DemoDataService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  private generateEmployee = () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const phone = faker.phone.number({
      style: 'international',
    });
    const email = faker.internet.email();
    const startDate = faker.date.past();
    const annualGross = faker.number.int({ min: 3000000, max: 3500000 });
    const bonus = faker.number.int({ min: 5000, max: 15000 });
    const commission = faker.number.int({ min: 3000, max: 7000 });

    return {
      employee_number: faker.number.int({ min: 1, max: 10000 }),
      first_name: firstName,
      last_name: lastName,
      name: fullName,
      job_title: faker.person.jobTitle(),
      phone: phone,
      email: email,
      employment_status: 'active',
      start_date: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      annual_gross: annualGross,
      bonus: bonus,
      commission: commission,
    };
  };

  private groupData = [
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

  private departmentData = [
    { name: 'Human Resources' },
    { name: 'Information Technology' },
    { name: 'Finance' },
  ];

  async seedDemoData(user_id: string, company_id: string) {
    const employeeData = faker.helpers.multiple(this.generateEmployee, {
      count: 2,
    });
    const savedEmployees = await this.db
      .insert(employees)
      .values(
        employeeData.map((employee) => ({
          ...employee,
          user_id,
          company_id,
          is_demo: true,
        })),
      )
      .returning({ id: employees.id }) // Get inserted employee IDs
      .execute();

    // Extract IDs and shuffle them randomly
    const employeeIds = savedEmployees.map((emp) => emp.id);
    const getRandomId = () =>
      employeeIds[Math.floor(Math.random() * employeeIds.length)];

    // Insert departments with random head_of_department
    await this.db
      .insert(departments)
      .values(
        this.departmentData.map((department) => ({
          name: department.name,
          company_id,
          head_of_department: getRandomId(), // Assign random employee as HoD
          is_demo: true,
        })),
      )
      .execute();

    // Insert employee groups
    await this.db
      .insert(employee_groups)
      .values(
        this.groupData.map((group) => ({
          ...group,
          company_id,
          is_demo: true,
        })),
      )
      .execute();
  }
}
