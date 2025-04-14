import {
  decimal,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';
import { employees } from './employee.schema';
import { users } from './users.schema';

export const officeLocations = pgTable('office_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  location_name: text('location_name').notNull(),
  latitude: decimal('latitude', {
    precision: 9,
    scale: 6,
  }).notNull(),
  longitude: decimal('longitude', {
    precision: 9,
    scale: 6,
  }).notNull(),
  address: text('address'),
});

export const employeeLocations = pgTable('employee_locations', {
  id: uuid('id').defaultRandom().primaryKey(), // Unique ID for the location record
  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  location_name: text('location_name').notNull(),
  latitude: decimal('latitude', { precision: 9, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 9, scale: 6 }).notNull(),
  address: text('address'), // Optional address field
  created_at: timestamp('created_at').defaultNow(), // Time when the location was added
  updated_at: timestamp('updated_at').defaultNow(),
});

export const holidays = pgTable('holidays', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  type: text('type'),
  country_code: text('country_code').notNull(),
  year: text('year'),
});

export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),

  date: text('date').notNull(),
  status: text('status').notNull(),
  check_in_time: timestamp('check_in_time'),
  check_out_time: timestamp('check_out_time'),
  total_hours: integer('total_hours'),

  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
});

export const leaves = pgTable('leaves', {
  id: uuid('id').defaultRandom().primaryKey(),
  leave_type: text('leave_type').notNull(),
  leave_entitlement: integer('leave_entitlement').notNull(),

  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
});

export const leave_balance = pgTable('leave_balance', {
  id: uuid('id').defaultRandom().primaryKey(),

  leave_type: text('leave_type').notNull(),
  total_leave_days: integer('total_leave_days').notNull(),
  used_leave_days: integer('used_leave_days').default(0),
  remaining_leave_days: integer('remaining_leave_days').default(0),

  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
});

export const leave_requests = pgTable('leave_requests', {
  id: uuid('id').defaultRandom().primaryKey(),

  leave_type: text('leave_type').notNull(),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  leave_status: text('leave_status').default('pending'),
  total_days_off: integer('total_days_off').default(0),
  notes: text('notes'),

  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  approved_by: uuid('approved_by').references(() => users.id, {
    onDelete: 'cascade',
  }),
});

export const daily_attendance_summary = pgTable('daily_attendance_summary', {
  id: uuid('id').defaultRandom().primaryKey(),

  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  date: text('date').notNull(),
  total_employees: integer('total_employees'),
  present: integer('present'),
  absent: integer('absent'),
  late: integer('late'),
  attendance_rate: decimal('attendance_rate', { precision: 5, scale: 2 }),
  average_check_in_time: time('average_check_in_time'),
  attendance_change_percent: decimal('attendance_change_percent', {
    precision: 5,
    scale: 2,
  }),
  late_change_percent: decimal('late_change_percent', {
    precision: 5,
    scale: 2,
  }),
  average_check_in_time_today: time('average_check_in_time_today'),
  average_check_in_time_yesterday: time('average_check_in_time_yesterday'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
