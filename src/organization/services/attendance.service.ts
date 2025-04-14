import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import {
  attendance,
  daily_attendance_summary,
  employeeLocations,
  holidays,
  officeLocations,
} from 'src/drizzle/schema/leave-attendance.schema';
import { companies } from 'src/drizzle/schema/company.schema';
import { employees } from 'src/drizzle/schema/employee.schema';
import {
  CreateEmployeeLocationDto,
  CreateOfficeLocationDto,
  UpdateEmployeeLocationDto,
  UpdateOfficeLocationDto,
} from '../dto/locations.dto';
import { departments } from 'src/drizzle/schema/department.schema';

@Injectable()
export class AttendanceService {
  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  private async getCompanyByUserId(company_id: string) {
    const result = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    if (result.length === 0) {
      throw new NotFoundException('Company not found');
    }

    return result[0]; // Return the first matching user
  }

  private async getEmployeeByUserId(employee_id: string) {
    const result = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();
    if (result.length === 0) {
      throw new NotFoundException('Employee not found');
    }
    return result[0]; // Return the first matching user
  }

  private isSaturday(date: Date): boolean {
    return date.getDay() === 6; // Saturday
  }

  private isSunday(date: Date): boolean {
    return date.getDay() === 0; // Sunday
  }

  private getWeekendsForYear(year: number) {
    const weekends: { date: Date; weekend: string }[] = [];
    const date = new Date(year, 0, 1); // Jan 1

    while (date.getFullYear() === year) {
      const day = date.getDay();
      if (day === 0 || day === 6) {
        weekends.push({
          date: new Date(date),
          weekend: day === 0 ? 'Sunday' : 'Saturday',
        });
      }
      date.setDate(date.getDate() + 1); // Move to next day
    }

    return weekends;
  }

  // Method to check if the date is a public holiday
  private async getPublicHolidaysForYear(year: number, countryCode: string) {
    const publicHolidays: {
      date: string;
      name: string;
      type: string;
    }[] = [];

    const apiKey = this.configService.get<string>('CALENDARIFIC_API_KEY');
    const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;

    try {
      const response = await axios.get(url);
      const holidays = response.data.response.holidays;

      // Format holidays to match the schema
      holidays.forEach((holiday: any) => {
        const holidayDate = new Date(holiday.date.iso);
        publicHolidays.push({
          date: holidayDate.toISOString().split('T')[0],
          name: holiday.name,
          type: holiday.primary_type,
        });
      });
    } catch (error) {
      console.error('Error fetching public holidays:', error);
    }

    return publicHolidays;
  }

  // Helper function to remove duplicate dates from the array
  private removeDuplicateDates(
    dates: { date: string; name: string; type: string }[],
  ): { type: string; name: string; date: string }[] {
    const seen = new Set<string>();
    const result: { type: string; name: string; date: string }[] = [];

    for (const item of dates) {
      if (!seen.has(item.date)) {
        seen.add(item.date);
        result.push(item);
      }
    }

    return result;
  }

  private async getNonWorkingDaysForYear(year: number, countryCode: string) {
    const nonWorkingDays: {
      date: string;
      name: string;
      type: string;
    }[] = [];

    // Step 1: Get all weekends
    const weekends = this.getWeekendsForYear(year);

    // Add weekends to nonWorkingDays array
    weekends.forEach((weekend) => {
      nonWorkingDays.push({
        date: weekend.date.toISOString().split('T')[0], // Format to 'YYYY-MM-DD'
        name: 'Weekend',
        type: 'Weekend', // Type is 'Weekend' for weekends
      });
    });

    // Step 2: Get all public holidays
    const publicHolidays = await this.getPublicHolidaysForYear(
      year,
      countryCode,
    );

    // Add public holidays to nonWorkingDays array
    publicHolidays.forEach((holiday) => {
      nonWorkingDays.push({
        date: holiday.date,
        name: holiday.name,
        type: holiday.type, // Using the type directly from the API response
      });
    });

    // Remove duplicates (if a public holiday happens to fall on a weekend)
    const uniqueNonWorkingDays = this.removeDuplicateDates(
      nonWorkingDays.map((day) => ({ ...day, date: day.date })),
    );

    return uniqueNonWorkingDays;
  }

  // Call This Method every 1st Day of the Month
  async insertHolidaysForCurrentYear(countryCode: string) {
    const currentYear = new Date().getFullYear();
    const allHolidays = await this.getNonWorkingDaysForYear(
      currentYear,
      countryCode,
    );

    const existingHolidays = await this.db
      .select({ date: holidays.date })
      .from(holidays);

    const existingDates = new Set(existingHolidays.map((h) => h.date));

    const newHolidays = allHolidays.filter(
      (holiday) => !existingDates.has(holiday.date),
    );

    if (newHolidays.length > 0) {
      await this.db.insert(holidays).values(
        newHolidays.map((holiday) => ({
          name: holiday.name,
          date: holiday.date,
          type: holiday.type,
          country_code: countryCode,
          year: currentYear.toString(),
        })),
      );
    }
  }

  // upcoming public holidays
  async getUpcomingPublicHolidays(countryCode: string) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const upcomingHolidays = await this.db
      .select()
      .from(holidays)
      .where(
        and(
          eq(holidays.country_code, countryCode),
          eq(holidays.year, currentYear.toString()),
        ),
      )
      .execute();

    const filteredHolidays = upcomingHolidays.filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate > currentDate; // Filter out past holidays
    });

    // get holidays where name is not "Weekend"
    const nonWeekendHolidays = filteredHolidays.filter(
      (holiday) => holiday.name !== 'Weekend',
    );

    // Sort holidays by date
    nonWeekendHolidays.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    return nonWeekendHolidays.map((holiday) => ({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
    }));
  }

  /// Location Management
  async createOfficeLocation(company_id: string, dto: CreateOfficeLocationDto) {
    // Check if the company exists
    await this.getCompanyByUserId(company_id);
    try {
      const { location_name, address, longitude, latitude } = dto;

      const newLocation = await this.db
        .insert(officeLocations)
        .values({
          company_id,
          location_name,
          address,
          longitude,
          latitude,
        })
        .returning({ id: officeLocations.id })
        .execute();

      return newLocation;
    } catch (error) {
      throw new BadRequestException(
        'Error creating office location. Please check your input and try again.' +
          error,
      );
    }
  }

  async getOfficeLocations(company_id: string) {
    try {
      // Check if the company exists
      await this.getCompanyByUserId(company_id);

      const locations = await this.db
        .select()
        .from(officeLocations)
        .where(eq(officeLocations.company_id, company_id))
        .execute();

      return locations;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching office locations. Please check your input and try again.' +
          error,
      );
    }
  }

  async getOfficeLocationById(id: string) {
    try {
      const location = await this.db
        .select()
        .from(officeLocations)
        .where(eq(officeLocations.id, id))
        .execute();

      if (location.length === 0) {
        throw new NotFoundException('Location not found');
      }

      return location[0];
    } catch (error) {
      throw new BadRequestException(
        'Error fetching office location. Please check your input and try again.' +
          error,
      );
    }
  }

  async updateOfficeLocation(id: string, dto: UpdateOfficeLocationDto) {
    try {
      const location = await this.getOfficeLocationById(id);

      await this.db
        .update(officeLocations)
        .set(dto)
        .where(eq(officeLocations.id, location.id))
        .execute();
      return 'Location updated successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error updating office location. Please check your input and try again.' +
          error,
      );
    }
  }

  async deleteOfficeLocation(id: string) {
    try {
      const location = await this.getOfficeLocationById(id);

      await this.db
        .delete(officeLocations)
        .where(eq(officeLocations.id, location.id))
        .execute();

      return 'Location Deleted successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error deleting office location. Please check your input and try again.' +
          error,
      );
    }
  }

  async createEmployeeLocation(dto: CreateEmployeeLocationDto) {
    try {
      // Check if the employee exists
      await this.getEmployeeByUserId(dto.employee_id);

      const { location_name, address, longitude, latitude, employee_id } = dto;

      // Check if the employee already has a location
      const existingLocation = await this.db
        .select()
        .from(employeeLocations)
        .where(eq(employeeLocations.employee_id, employee_id))
        .execute();

      if (existingLocation.length > 0) {
        throw new NotFoundException('Employee already has a location');
      }

      await this.db
        .insert(employeeLocations)
        .values({
          employee_id,
          location_name,
          address,
          longitude,
          latitude,
        })
        .execute();

      return 'Employee location created successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error creating employee location. Please check your input and try again.' +
          error,
      );
    }
  }

  async getAllEmployeeLocationsByCompanyId(company_id: string) {
    try {
      const locations = await this.db
        .select({
          id: employeeLocations.id,
          location_name: employeeLocations.location_name,
          address: employeeLocations.address,
          longitude: employeeLocations.longitude,
          latitude: employeeLocations.latitude,
          first_name: employees.first_name,
          last_name: employees.last_name,
        })
        .from(employeeLocations)
        .innerJoin(employees, eq(employeeLocations.employee_id, employees.id))
        .where(eq(employees.company_id, company_id))
        .execute();

      if (locations.length === 0) {
        throw new NotFoundException(
          'No employee locations found for this company',
        );
      }

      return locations;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching employee locations. Please check your input and try again. ' +
          error,
      );
    }
  }

  async updateEmployeeLocation(id: string, dto: UpdateEmployeeLocationDto) {
    try {
      const location = await this.db
        .select()
        .from(employeeLocations)
        .where(eq(employeeLocations.id, id))
        .execute();

      if (location.length === 0) {
        throw new NotFoundException('Location not found');
      }

      await this.db
        .update(employeeLocations)
        .set({
          location_name: dto.location_name,
          address: dto.address,
          longitude: dto.longitude,
          latitude: dto.latitude,
        })
        .where(eq(employeeLocations.id, location[0].id))
        .execute();

      return 'Location updated successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error updating employee location. Please check your input and try again.' +
          error,
      );
    }
  }

  async deleteEmployeeLocation(id: string) {
    try {
      const location = await this.db
        .select()
        .from(employeeLocations)
        .where(eq(employeeLocations.id, id))
        .execute();

      if (location.length === 0) {
        throw new NotFoundException('Location not found');
      }

      await this.db
        .delete(employeeLocations)
        .where(eq(employeeLocations.id, location[0].id))
        .execute();

      return 'Location deleted successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error deleting employee location. Please check your input and try again.' +
          error,
      );
    }
  }

  // Attendance Management

  // Helper method to check if the employee is at a valid location
  async checkLocation(
    employee_id: string,
    latitude: string,
    longitude: string,
  ) {
    // Check if the employee exists
    const employee = await this.getEmployeeByUserId(employee_id);
    // Fetch the employee's location and the company's office location
    const employeeLocation = await this.db
      .select()
      .from(employeeLocations)
      .where(eq(employeeLocations.employee_id, employee_id))
      .execute();

    const companyLocations = await this.db
      .select()
      .from(officeLocations)
      .where(eq(officeLocations.company_id, employee.company_id))
      .execute();

    if (employeeLocation.length > 0) {
      // Check if the employee's current location matches any of their set locations
      const isEmployeeInValidLocation = employeeLocation.some((location) => {
        return (
          Math.abs(Number(location.latitude) - Number(latitude)) < 0.0001 && // Allow a small threshold for latitude
          Math.abs(Number(location.longitude) - Number(longitude)) < 0.0001 // Allow a small threshold for longitude
        );
      });

      if (!isEmployeeInValidLocation) {
        throw new NotFoundException('Employee is not at a valid location');
      }
    } else {
      // If employee doesn't have a set location, check if they're within any of the office locations
      const isInOfficeLocation = companyLocations.some((location) => {
        return (
          Math.abs(Number(location.latitude) - Number(latitude)) < 0.0001 && // Allow a small threshold for latitude
          Math.abs(Number(location.longitude) - Number(longitude)) < 0.0001 // Allow a small threshold for longitude
        );
      });

      if (!isInOfficeLocation) {
        throw new NotFoundException(
          'Employee is not at an authorized office location',
        );
      }
    }
  }

  async clockIn(employee_id: string, latitude: string, longitude: string) {
    const currentDate = new Date().toISOString().split('T')[0];

    // Check if the employee is already clocked in
    const existingAttendance = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employee_id, employee_id),
          eq(attendance.date, currentDate),
        ),
      )
      .execute();

    if (existingAttendance.length > 0) {
      throw new NotFoundException('Employee already clocked in');
    }

    // Check if the employee is at a valid location
    await this.checkLocation(employee_id, latitude, longitude);

    // Insert new attendance record
    await this.db
      .insert(attendance)
      .values({
        employee_id: employee_id,
        date: currentDate,
        status: 'clocked_in',
        check_in_time: new Date(),
        check_out_time: null,
        total_hours: null,
      })
      .execute();

    return 'Clocked in successfully';
  }

  async clockOut(employee_id: string, latitude: string, longitude: string) {
    const currentDate = new Date().toISOString().split('T')[0];

    // Check if the employee exists
    await this.getEmployeeByUserId(employee_id);

    // Check if the employee is clocked in
    const existingAttendance = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employee_id, employee_id),
          eq(attendance.date, currentDate),
        ),
      )
      .execute();

    if (existingAttendance.length === 0) {
      throw new NotFoundException('Employee is not clocked in');
    }

    // Check if the employee is at a valid location
    await this.checkLocation(employee_id, latitude, longitude);

    // Calculate total hours worked
    const checkInTime = existingAttendance[0].check_in_time;
    const alreadyCheckedOutTime = existingAttendance[0].check_out_time;

    if (alreadyCheckedOutTime) {
      throw new NotFoundException('Employee already clocked out');
    }

    if (!checkInTime) {
      throw new NotFoundException('Check-in time is missing for the employee');
    }

    const checkOutTime = new Date();
    const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / 36e5;

    // Update attendance record with check-out time
    await this.db
      .update(attendance)
      .set({
        check_out_time: new Date(),
        status: 'clocked_out',
        total_hours: Math.floor(totalHours),
      })
      .where(
        and(
          eq(attendance.employee_id, employee_id),
          eq(attendance.date, currentDate),
        ),
      )
      .execute();

    return 'Clocked out successfully';
  }

  async getDailyAttendanceSummary(companyId: string) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];
    const workStarts = new Date();
    workStarts.setHours(9, 0, 0, 0);

    function parseDbDate(date: string | Date | null): Date | null {
      if (!date) return null;
      if (typeof date === 'string') {
        return new Date(date.replace(' ', 'T'));
      }
      return new Date(date);
    }

    const allEmployees = await this.db
      .select({
        id: employees.id,
        first_name: employees.first_name,
        last_name: employees.last_name,
        department_id: employees.department_id,
      })
      .from(employees)
      .where(eq(employees.company_id, companyId));

    const allDepartments = await this.db.select().from(departments);

    const todayAttendance = await this.db
      .select()
      .from(attendance)
      .where(eq(attendance.date, today));

    const yesterdayAttendance = await this.db
      .select()
      .from(attendance)
      .where(eq(attendance.date, yesterday));

    // --- Build summaryList and count logic ---
    const summaryList = allEmployees.map((emp) => {
      const record = todayAttendance.find((a) => a.employee_id === emp.id);
      const department = allDepartments.find((d) => d.id === emp.department_id);

      const checkIn = record?.check_in_time
        ? parseDbDate(record.check_in_time)
        : null;
      const checkOut = record?.check_out_time
        ? parseDbDate(record.check_out_time)
        : null;

      const isLate = checkIn ? checkIn > workStarts : false;

      let status: 'absent' | 'present' | 'late' = 'absent';
      if (checkIn && !isLate) status = 'present';
      if (checkIn && isLate) status = 'late';

      return {
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: department?.name || 'Unknown',
        check_in_time: checkIn ? checkIn.toISOString() : null,
        check_out_time: checkOut ? checkOut.toISOString() : null,
        status,
      };
    });

    const presentCount = summaryList.filter(
      (emp) => emp.status === 'present',
    ).length;
    const lateCount = summaryList.filter((emp) => emp.status === 'late').length;
    const absentCount = summaryList.filter(
      (emp) => emp.status === 'absent',
    ).length;

    const checkInTimes = summaryList
      .filter((emp) => emp.status !== 'absent' && emp.check_in_time)
      .map((emp) => new Date(emp.check_in_time!).getTime());

    const averageCheckInTime =
      checkInTimes.length > 0
        ? new Date(
            checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length,
          ).toISOString()
        : null;

    const yesterdayPresent = yesterdayAttendance.length;
    const yesterdayLate = yesterdayAttendance.filter((rec) => {
      const checkIn = rec.check_in_time ? parseDbDate(rec.check_in_time) : null;
      return checkIn && checkIn > workStarts;
    }).length;

    const yesterdayCheckInAvg =
      yesterdayAttendance.length > 0
        ? new Date(
            yesterdayAttendance
              .filter((r) => r.check_in_time)
              .reduce(
                (acc, r) => acc + new Date(r.check_in_time!).getTime(),
                0,
              ) / yesterdayAttendance.length,
          ).toISOString()
        : new Date(0).toISOString(); // Default to 1970 if no data

    const attendanceChange =
      yesterdayPresent > 0
        ? ((presentCount + lateCount - yesterdayPresent) / yesterdayPresent) *
          100
        : 0;

    const lateChange =
      yesterdayLate > 0
        ? ((lateCount - yesterdayLate) / yesterdayLate) * 100
        : 0;

    const yesterdayAbsent = allEmployees.length - yesterdayPresent;

    const absentChange =
      yesterdayAbsent > 0
        ? ((absentCount - yesterdayAbsent) / yesterdayAbsent) * 100
        : 0;

    return [
      {
        details: {
          date: today,
          totalEmployees: allEmployees.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          attendanceRate: `${(((presentCount + lateCount) / allEmployees.length) * 100).toFixed(2)}%`,
          averageCheckInTime,
        },
        summaryList,
        metrics: {
          attendanceChangePercent: Math.round(attendanceChange),
          lateChangePercent: Math.round(lateChange),
          absentChange: absentChange.toFixed(2),
          averageCheckInTimeChange: {
            today: averageCheckInTime,
            yesterday: yesterdayCheckInAvg,
          },
        },
      },
    ];
  }

  async saveDailyAttendanceSummary(companyId: string) {
    const [summary] = await this.getDailyAttendanceSummary(companyId); // Extract first object from array

    const { details, metrics } = summary;

    await this.db.insert(daily_attendance_summary).values({
      company_id: companyId,
      date: details.date,
      total_employees: details.totalEmployees,
      present: details.present,
      absent: details.absent,
      late: details.late,
      attendance_rate: parseFloat(details.attendanceRate).toString(),
      average_check_in_time: details.averageCheckInTime
        ? new Date(details.averageCheckInTime).toTimeString().slice(0, 8)
        : null,
      attendance_change_percent: metrics.attendanceChangePercent.toString(),
      late_change_percent: metrics.lateChangePercent.toString(),
      average_check_in_time_today: metrics.averageCheckInTimeChange.today
        ? new Date(metrics.averageCheckInTimeChange.today)
            .toTimeString()
            .slice(0, 8)
        : null,
      average_check_in_time_yesterday: metrics.averageCheckInTimeChange
        .yesterday
        ? new Date(metrics.averageCheckInTimeChange.yesterday)
            .toTimeString()
            .slice(0, 8)
        : null,
    });
  }

  async getAttendanceSummaryByDate(date: string, companyId: string) {
    const targetDate = new Date(date).toISOString().split('T')[0];
    const workStarts = new Date();
    workStarts.setHours(9, 0, 0, 0); // 9:00 AM

    function parseDbDate(date: string | Date | null): Date | null {
      if (!date) return null;
      if (typeof date === 'string') {
        return new Date(date.replace(' ', 'T'));
      }
      return new Date(date);
    }

    const allEmployees = await this.db
      .select({
        id: employees.id,
        first_name: employees.first_name,
        last_name: employees.last_name,
        department_id: employees.department_id,
      })
      .from(employees)
      .where(eq(employees.company_id, companyId));

    const allDepartments = await this.db.select().from(departments);

    const attendanceRecords = await this.db
      .select()
      .from(attendance)
      .where(eq(attendance.date, targetDate));

    const summaryList = allEmployees.map((emp) => {
      const record = attendanceRecords.find((a) => a.employee_id === emp.id);
      const department = allDepartments.find((d) => d.id === emp.department_id);

      const checkIn = record?.check_in_time
        ? parseDbDate(record.check_in_time)
        : null;
      const checkOut = record?.check_out_time
        ? parseDbDate(record.check_out_time)
        : null;

      const isLate = checkIn ? checkIn > workStarts : false;

      let status: 'absent' | 'present' | 'late' = 'absent';
      if (checkIn && !isLate) status = 'present';
      if (checkIn && isLate) status = 'late';

      return {
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: department?.name || 'Unknown',
        check_in_time: checkIn ? checkIn.toISOString() : null,
        check_out_time: checkOut ? checkOut.toISOString() : null,
        status,
      };
    });

    return { date: targetDate, summaryList };
  }
}
