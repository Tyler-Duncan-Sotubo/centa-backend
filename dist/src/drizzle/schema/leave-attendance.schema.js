"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daily_attendance_summary = exports.leave_requests = exports.leave_balance = exports.leaves = exports.attendance = exports.holidays = exports.employeeLocations = exports.officeLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
const employee_schema_1 = require("./employee.schema");
const users_schema_1 = require("./users.schema");
exports.officeLocations = (0, pg_core_1.pgTable)('office_locations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    location_name: (0, pg_core_1.text)('location_name').notNull(),
    latitude: (0, pg_core_1.decimal)('latitude', {
        precision: 9,
        scale: 6,
    }).notNull(),
    longitude: (0, pg_core_1.decimal)('longitude', {
        precision: 9,
        scale: 6,
    }).notNull(),
    address: (0, pg_core_1.text)('address'),
});
exports.employeeLocations = (0, pg_core_1.pgTable)('employee_locations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    location_name: (0, pg_core_1.text)('location_name').notNull(),
    latitude: (0, pg_core_1.decimal)('latitude', { precision: 9, scale: 6 }).notNull(),
    longitude: (0, pg_core_1.decimal)('longitude', { precision: 9, scale: 6 }).notNull(),
    address: (0, pg_core_1.text)('address'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
exports.holidays = (0, pg_core_1.pgTable)('holidays', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    date: (0, pg_core_1.text)('date').notNull(),
    type: (0, pg_core_1.text)('type'),
    country_code: (0, pg_core_1.text)('country_code').notNull(),
    year: (0, pg_core_1.text)('year'),
});
exports.attendance = (0, pg_core_1.pgTable)('attendance', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    date: (0, pg_core_1.text)('date').notNull(),
    status: (0, pg_core_1.text)('status').notNull(),
    check_in_time: (0, pg_core_1.timestamp)('check_in_time'),
    check_out_time: (0, pg_core_1.timestamp)('check_out_time'),
    total_hours: (0, pg_core_1.integer)('total_hours'),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
});
exports.leaves = (0, pg_core_1.pgTable)('leaves', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    leave_type: (0, pg_core_1.text)('leave_type').notNull(),
    leave_entitlement: (0, pg_core_1.integer)('leave_entitlement').notNull(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
});
exports.leave_balance = (0, pg_core_1.pgTable)('leave_balance', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    leave_type: (0, pg_core_1.text)('leave_type').notNull(),
    total_leave_days: (0, pg_core_1.integer)('total_leave_days').notNull(),
    used_leave_days: (0, pg_core_1.integer)('used_leave_days').default(0),
    remaining_leave_days: (0, pg_core_1.integer)('remaining_leave_days').default(0),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
});
exports.leave_requests = (0, pg_core_1.pgTable)('leave_requests', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    leave_type: (0, pg_core_1.text)('leave_type').notNull(),
    start_date: (0, pg_core_1.text)('start_date').notNull(),
    end_date: (0, pg_core_1.text)('end_date').notNull(),
    leave_status: (0, pg_core_1.text)('leave_status').default('pending'),
    total_days_off: (0, pg_core_1.integer)('total_days_off').default(0),
    notes: (0, pg_core_1.text)('notes'),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    approved_by: (0, pg_core_1.uuid)('approved_by').references(() => users_schema_1.users.id, {
        onDelete: 'cascade',
    }),
});
exports.daily_attendance_summary = (0, pg_core_1.pgTable)('daily_attendance_summary', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.text)('date').notNull(),
    total_employees: (0, pg_core_1.integer)('total_employees'),
    present: (0, pg_core_1.integer)('present'),
    absent: (0, pg_core_1.integer)('absent'),
    late: (0, pg_core_1.integer)('late'),
    attendance_rate: (0, pg_core_1.decimal)('attendance_rate', { precision: 5, scale: 2 }),
    average_check_in_time: (0, pg_core_1.time)('average_check_in_time'),
    attendance_change_percent: (0, pg_core_1.decimal)('attendance_change_percent', {
        precision: 5,
        scale: 2,
    }),
    late_change_percent: (0, pg_core_1.decimal)('late_change_percent', {
        precision: 5,
        scale: 2,
    }),
    average_check_in_time_today: (0, pg_core_1.time)('average_check_in_time_today'),
    average_check_in_time_yesterday: (0, pg_core_1.time)('average_check_in_time_yesterday'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
//# sourceMappingURL=leave-attendance.schema.js.map