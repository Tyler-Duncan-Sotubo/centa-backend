import {
  pgTable,
  uuid,
  integer,
  timestamp,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import {
  applications,
  interviewEmailTemplates,
  InterviewStage,
  scorecard_templates,
} from '../../schema';
import { users } from 'src/drizzle/schema';

export const interviews = pgTable(
  'interviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .references(() => applications.id, { onDelete: 'cascade' })
      .notNull(),

    stage: InterviewStage('stage').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    durationMins: integer('duration_mins').notNull(),

    // Generic meeting link
    meetingLink: varchar('meeting_link', { length: 512 }),
    eventId: varchar('event_id', { length: 128 }),

    // Optional email template for the interview
    emailTemplateId: uuid('email_template_id').references(
      () => interviewEmailTemplates.id,
      { onDelete: 'set null' },
    ),

    status: varchar('status', { length: 20 }).default('scheduled'),
    mode: varchar('mode', { length: 20 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_int_app').on(t.applicationId)],
);

// If you want multiple interviewers:
export const interviewInterviewers = pgTable(
  'interview_interviewers',
  {
    interviewId: uuid('interview_id')
      .references(() => interviews.id, { onDelete: 'cascade' })
      .notNull(),
    interviewerId: uuid('interviewer_id')
      .references(() => users.id)
      .notNull(),

    // Optional scorecard template for the interview
    scorecardTemplateId: uuid('scorecard_template_id').references(
      () => scorecard_templates.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [
    index('idx_ii_interview').on(t.interviewId),
    index('idx_ii_interviewer').on(t.interviewerId),
  ],
);
