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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const leave_attendance_schema_1 = require("../../drizzle/schema/leave-attendance.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const department_schema_1 = require("../../drizzle/schema/department.schema");
let AttendanceService = class AttendanceService {
    constructor(configService, db) {
        this.configService = configService;
        this.db = db;
    }
    async getCompanyByUserId(company_id) {
        const result = await this.db
            .select()
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.NotFoundException('Company not found');
        }
        return result[0];
    }
    async getEmployeeByUserId(employee_id) {
        const result = await this.db
            .select()
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.NotFoundException('Employee not found');
        }
        return result[0];
    }
    isSaturday(date) {
        return date.getDay() === 6;
    }
    isSunday(date) {
        return date.getDay() === 0;
    }
    getWeekendsForYear(year) {
        const weekends = [];
        const date = new Date(year, 0, 1);
        while (date.getFullYear() === year) {
            const day = date.getDay();
            if (day === 0 || day === 6) {
                weekends.push({
                    date: new Date(date),
                    weekend: day === 0 ? 'Sunday' : 'Saturday',
                });
            }
            date.setDate(date.getDate() + 1);
        }
        return weekends;
    }
    async getPublicHolidaysForYear(year, countryCode) {
        const publicHolidays = [];
        const apiKey = this.configService.get('CALENDARIFIC_API_KEY');
        const url = `https://calendarific.com/api/v2/holidays?country=${countryCode}&year=${year}&api_key=${apiKey}`;
        try {
            const response = await axios_1.default.get(url);
            const holidays = response.data.response.holidays;
            holidays.forEach((holiday) => {
                const holidayDate = new Date(holiday.date.iso);
                publicHolidays.push({
                    date: holidayDate.toISOString().split('T')[0],
                    name: holiday.name,
                    type: holiday.primary_type,
                });
            });
        }
        catch (error) {
            console.error('Error fetching public holidays:', error);
        }
        return publicHolidays;
    }
    removeDuplicateDates(dates) {
        const seen = new Set();
        const result = [];
        for (const item of dates) {
            if (!seen.has(item.date)) {
                seen.add(item.date);
                result.push(item);
            }
        }
        return result;
    }
    async getNonWorkingDaysForYear(year, countryCode) {
        const nonWorkingDays = [];
        const weekends = this.getWeekendsForYear(year);
        weekends.forEach((weekend) => {
            nonWorkingDays.push({
                date: weekend.date.toISOString().split('T')[0],
                name: 'Weekend',
                type: 'Weekend',
            });
        });
        const publicHolidays = await this.getPublicHolidaysForYear(year, countryCode);
        publicHolidays.forEach((holiday) => {
            nonWorkingDays.push({
                date: holiday.date,
                name: holiday.name,
                type: holiday.type,
            });
        });
        const uniqueNonWorkingDays = this.removeDuplicateDates(nonWorkingDays.map((day) => ({ ...day, date: day.date })));
        return uniqueNonWorkingDays;
    }
    async insertHolidaysForCurrentYear(countryCode) {
        const currentYear = new Date().getFullYear();
        const allHolidays = await this.getNonWorkingDaysForYear(currentYear, countryCode);
        const existingHolidays = await this.db
            .select({ date: leave_attendance_schema_1.holidays.date })
            .from(leave_attendance_schema_1.holidays);
        const existingDates = new Set(existingHolidays.map((h) => h.date));
        const newHolidays = allHolidays.filter((holiday) => !existingDates.has(holiday.date));
        if (newHolidays.length > 0) {
            await this.db.insert(leave_attendance_schema_1.holidays).values(newHolidays.map((holiday) => ({
                name: holiday.name,
                date: holiday.date,
                type: holiday.type,
                country_code: countryCode,
                year: currentYear.toString(),
            })));
        }
    }
    async getUpcomingPublicHolidays(countryCode) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const upcomingHolidays = await this.db
            .select()
            .from(leave_attendance_schema_1.holidays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.holidays.country_code, countryCode), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.holidays.year, currentYear.toString())))
            .execute();
        const filteredHolidays = upcomingHolidays.filter((holiday) => {
            const holidayDate = new Date(holiday.date);
            return holidayDate > currentDate;
        });
        const nonWeekendHolidays = filteredHolidays.filter((holiday) => holiday.name !== 'Weekend');
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
    async createOfficeLocation(company_id, dto) {
        await this.getCompanyByUserId(company_id);
        try {
            const { location_name, address, longitude, latitude } = dto;
            const newLocation = await this.db
                .insert(leave_attendance_schema_1.officeLocations)
                .values({
                company_id,
                location_name,
                address,
                longitude,
                latitude,
            })
                .returning({ id: leave_attendance_schema_1.officeLocations.id })
                .execute();
            return newLocation;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error creating office location. Please check your input and try again.' +
                error);
        }
    }
    async getOfficeLocations(company_id) {
        try {
            await this.getCompanyByUserId(company_id);
            const locations = await this.db
                .select()
                .from(leave_attendance_schema_1.officeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.officeLocations.company_id, company_id))
                .execute();
            return locations;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching office locations. Please check your input and try again.' +
                error);
        }
    }
    async getOfficeLocationById(id) {
        try {
            const location = await this.db
                .select()
                .from(leave_attendance_schema_1.officeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.officeLocations.id, id))
                .execute();
            if (location.length === 0) {
                throw new common_1.NotFoundException('Location not found');
            }
            return location[0];
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching office location. Please check your input and try again.' +
                error);
        }
    }
    async updateOfficeLocation(id, dto) {
        try {
            const location = await this.getOfficeLocationById(id);
            await this.db
                .update(leave_attendance_schema_1.officeLocations)
                .set(dto)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.officeLocations.id, location.id))
                .execute();
            return 'Location updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error updating office location. Please check your input and try again.' +
                error);
        }
    }
    async deleteOfficeLocation(id) {
        try {
            const location = await this.getOfficeLocationById(id);
            await this.db
                .delete(leave_attendance_schema_1.officeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.officeLocations.id, location.id))
                .execute();
            return 'Location Deleted successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error deleting office location. Please check your input and try again.' +
                error);
        }
    }
    async createEmployeeLocation(dto) {
        try {
            await this.getEmployeeByUserId(dto.employee_id);
            const { location_name, address, longitude, latitude, employee_id } = dto;
            const existingLocation = await this.db
                .select()
                .from(leave_attendance_schema_1.employeeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.employee_id, employee_id))
                .execute();
            if (existingLocation.length > 0) {
                throw new common_1.NotFoundException('Employee already has a location');
            }
            await this.db
                .insert(leave_attendance_schema_1.employeeLocations)
                .values({
                employee_id,
                location_name,
                address,
                longitude,
                latitude,
            })
                .execute();
            return 'Employee location created successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error creating employee location. Please check your input and try again.' +
                error);
        }
    }
    async getAllEmployeeLocationsByCompanyId(company_id) {
        try {
            const locations = await this.db
                .select({
                id: leave_attendance_schema_1.employeeLocations.id,
                location_name: leave_attendance_schema_1.employeeLocations.location_name,
                address: leave_attendance_schema_1.employeeLocations.address,
                longitude: leave_attendance_schema_1.employeeLocations.longitude,
                latitude: leave_attendance_schema_1.employeeLocations.latitude,
                first_name: employee_schema_1.employees.first_name,
                last_name: employee_schema_1.employees.last_name,
            })
                .from(leave_attendance_schema_1.employeeLocations)
                .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.employee_id, employee_schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
                .execute();
            if (locations.length === 0) {
                throw new common_1.NotFoundException('No employee locations found for this company');
            }
            return locations;
        }
        catch (error) {
            throw new common_1.BadRequestException('Error fetching employee locations. Please check your input and try again. ' +
                error);
        }
    }
    async updateEmployeeLocation(id, dto) {
        try {
            const location = await this.db
                .select()
                .from(leave_attendance_schema_1.employeeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.id, id))
                .execute();
            if (location.length === 0) {
                throw new common_1.NotFoundException('Location not found');
            }
            await this.db
                .update(leave_attendance_schema_1.employeeLocations)
                .set({
                location_name: dto.location_name,
                address: dto.address,
                longitude: dto.longitude,
                latitude: dto.latitude,
            })
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.id, location[0].id))
                .execute();
            return 'Location updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error updating employee location. Please check your input and try again.' +
                error);
        }
    }
    async deleteEmployeeLocation(id) {
        try {
            const location = await this.db
                .select()
                .from(leave_attendance_schema_1.employeeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.id, id))
                .execute();
            if (location.length === 0) {
                throw new common_1.NotFoundException('Location not found');
            }
            await this.db
                .delete(leave_attendance_schema_1.employeeLocations)
                .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.id, location[0].id))
                .execute();
            return 'Location deleted successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException('Error deleting employee location. Please check your input and try again.' +
                error);
        }
    }
    async checkLocation(employee_id, latitude, longitude) {
        const employee = await this.getEmployeeByUserId(employee_id);
        const employeeLocation = await this.db
            .select()
            .from(leave_attendance_schema_1.employeeLocations)
            .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.employeeLocations.employee_id, employee_id))
            .execute();
        const companyLocations = await this.db
            .select()
            .from(leave_attendance_schema_1.officeLocations)
            .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.officeLocations.company_id, employee.company_id))
            .execute();
        if (employeeLocation.length > 0) {
            const isEmployeeInValidLocation = employeeLocation.some((location) => {
                return (Math.abs(Number(location.latitude) - Number(latitude)) < 0.0001 &&
                    Math.abs(Number(location.longitude) - Number(longitude)) < 0.0001);
            });
            if (!isEmployeeInValidLocation) {
                throw new common_1.NotFoundException('Employee is not at a valid location');
            }
        }
        else {
            const isInOfficeLocation = companyLocations.some((location) => {
                return (Math.abs(Number(location.latitude) - Number(latitude)) < 0.0001 &&
                    Math.abs(Number(location.longitude) - Number(longitude)) < 0.0001);
            });
            if (!isInOfficeLocation) {
                throw new common_1.NotFoundException('Employee is not at an authorized office location');
            }
        }
    }
    async clockIn(employee_id, latitude, longitude) {
        const currentDate = new Date().toISOString().split('T')[0];
        const existingAttendance = await this.db
            .select()
            .from(leave_attendance_schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.employee_id, employee_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.date, currentDate)))
            .execute();
        if (existingAttendance.length > 0) {
            throw new common_1.NotFoundException('Employee already clocked in');
        }
        await this.checkLocation(employee_id, latitude, longitude);
        await this.db
            .insert(leave_attendance_schema_1.attendance)
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
    async clockOut(employee_id, latitude, longitude) {
        const currentDate = new Date().toISOString().split('T')[0];
        await this.getEmployeeByUserId(employee_id);
        const existingAttendance = await this.db
            .select()
            .from(leave_attendance_schema_1.attendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.employee_id, employee_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.date, currentDate)))
            .execute();
        if (existingAttendance.length === 0) {
            throw new common_1.NotFoundException('Employee is not clocked in');
        }
        await this.checkLocation(employee_id, latitude, longitude);
        const checkInTime = existingAttendance[0].check_in_time;
        const alreadyCheckedOutTime = existingAttendance[0].check_out_time;
        if (alreadyCheckedOutTime) {
            throw new common_1.NotFoundException('Employee already clocked out');
        }
        if (!checkInTime) {
            throw new common_1.NotFoundException('Check-in time is missing for the employee');
        }
        const checkOutTime = new Date();
        const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / 36e5;
        await this.db
            .update(leave_attendance_schema_1.attendance)
            .set({
            check_out_time: new Date(),
            status: 'clocked_out',
            total_hours: Math.floor(totalHours),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.employee_id, employee_id), (0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.date, currentDate)))
            .execute();
        return 'Clocked out successfully';
    }
    async getDailyAttendanceSummary(companyId) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split('T')[0];
        const workStarts = new Date();
        workStarts.setHours(9, 0, 0, 0);
        function parseDbDate(date) {
            if (!date)
                return null;
            if (typeof date === 'string') {
                return new Date(date.replace(' ', 'T'));
            }
            return new Date(date);
        }
        const allEmployees = await this.db
            .select({
            id: employee_schema_1.employees.id,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            department_id: employee_schema_1.employees.department_id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, companyId));
        const allDepartments = await this.db.select().from(department_schema_1.departments);
        const todayAttendance = await this.db
            .select()
            .from(leave_attendance_schema_1.attendance)
            .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.date, today));
        const yesterdayAttendance = await this.db
            .select()
            .from(leave_attendance_schema_1.attendance)
            .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.date, yesterday));
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
            let status = 'absent';
            if (checkIn && !isLate)
                status = 'present';
            if (checkIn && isLate)
                status = 'late';
            return {
                employee_id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                department: department?.name || 'Unknown',
                check_in_time: checkIn ? checkIn.toISOString() : null,
                check_out_time: checkOut ? checkOut.toISOString() : null,
                status,
            };
        });
        const presentCount = summaryList.filter((emp) => emp.status === 'present').length;
        const lateCount = summaryList.filter((emp) => emp.status === 'late').length;
        const absentCount = summaryList.filter((emp) => emp.status === 'absent').length;
        const checkInTimes = summaryList
            .filter((emp) => emp.status !== 'absent' && emp.check_in_time)
            .map((emp) => new Date(emp.check_in_time).getTime());
        const averageCheckInTime = checkInTimes.length > 0
            ? new Date(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length).toISOString()
            : null;
        const yesterdayPresent = yesterdayAttendance.length;
        const yesterdayLate = yesterdayAttendance.filter((rec) => {
            const checkIn = rec.check_in_time ? parseDbDate(rec.check_in_time) : null;
            return checkIn && checkIn > workStarts;
        }).length;
        const yesterdayCheckInAvg = yesterdayAttendance.length > 0
            ? new Date(yesterdayAttendance
                .filter((r) => r.check_in_time)
                .reduce((acc, r) => acc + new Date(r.check_in_time).getTime(), 0) / yesterdayAttendance.length).toISOString()
            : new Date(0).toISOString();
        const attendanceChange = yesterdayPresent > 0
            ? ((presentCount + lateCount - yesterdayPresent) / yesterdayPresent) *
                100
            : 0;
        const lateChange = yesterdayLate > 0
            ? ((lateCount - yesterdayLate) / yesterdayLate) * 100
            : 0;
        const yesterdayAbsent = allEmployees.length - yesterdayPresent;
        const absentChange = yesterdayAbsent > 0
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
    async saveDailyAttendanceSummary(companyId) {
        const [summary] = await this.getDailyAttendanceSummary(companyId);
        const { details, metrics } = summary;
        await this.db.insert(leave_attendance_schema_1.daily_attendance_summary).values({
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
    async getAttendanceSummaryByDate(date, companyId) {
        const targetDate = new Date(date).toISOString().split('T')[0];
        const workStarts = new Date();
        workStarts.setHours(9, 0, 0, 0);
        function parseDbDate(date) {
            if (!date)
                return null;
            if (typeof date === 'string') {
                return new Date(date.replace(' ', 'T'));
            }
            return new Date(date);
        }
        const allEmployees = await this.db
            .select({
            id: employee_schema_1.employees.id,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            department_id: employee_schema_1.employees.department_id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, companyId));
        const allDepartments = await this.db.select().from(department_schema_1.departments);
        const attendanceRecords = await this.db
            .select()
            .from(leave_attendance_schema_1.attendance)
            .where((0, drizzle_orm_1.eq)(leave_attendance_schema_1.attendance.date, targetDate));
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
            let status = 'absent';
            if (checkIn && !isLate)
                status = 'present';
            if (checkIn && isLate)
                status = 'late';
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
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map