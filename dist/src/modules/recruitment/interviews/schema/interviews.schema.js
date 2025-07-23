"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewInterviewers = exports.interviews = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
const schema_2 = require("../../../../drizzle/schema");
exports.interviews = (0, pg_core_1.pgTable)('interviews', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)('application_id')
        .references(() => schema_1.applications.id, { onDelete: 'cascade' })
        .notNull(),
    stage: (0, schema_1.InterviewStage)('stage').notNull(),
    scheduledFor: (0, pg_core_1.timestamp)('scheduled_for', { withTimezone: true }).notNull(),
    durationMins: (0, pg_core_1.integer)('duration_mins').notNull(),
    meetingLink: (0, pg_core_1.varchar)('meeting_link', { length: 512 }),
    eventId: (0, pg_core_1.varchar)('event_id', { length: 128 }),
    emailTemplateId: (0, pg_core_1.uuid)('email_template_id').references(() => schema_1.interviewEmailTemplates.id, { onDelete: 'set null' }),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('scheduled'),
    mode: (0, pg_core_1.varchar)('mode', { length: 20 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_int_app').on(t.applicationId)]);
exports.interviewInterviewers = (0, pg_core_1.pgTable)('interview_interviewers', {
    interviewId: (0, pg_core_1.uuid)('interview_id')
        .references(() => exports.interviews.id, { onDelete: 'cascade' })
        .notNull(),
    interviewerId: (0, pg_core_1.uuid)('interviewer_id')
        .references(() => schema_2.users.id)
        .notNull(),
    scorecardTemplateId: (0, pg_core_1.uuid)('scorecard_template_id').references(() => schema_1.scorecard_templates.id, { onDelete: 'set null' }),
}, (t) => [
    (0, pg_core_1.index)('idx_ii_interview').on(t.interviewId),
    (0, pg_core_1.index)('idx_ii_interviewer').on(t.interviewerId),
]);
//# sourceMappingURL=interviews.schema.js.map