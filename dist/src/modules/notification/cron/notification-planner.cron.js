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
var NotificationPlannerCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPlannerCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const notification_engine_service_1 = require("../notification-engine.service");
const helper_1 = require("../helpers/helper");
let NotificationPlannerCron = NotificationPlannerCron_1 = class NotificationPlannerCron {
    constructor(db, engine) {
        this.db = db;
        this.engine = engine;
        this.logger = new common_1.Logger(NotificationPlannerCron_1.name);
    }
    async runDailyPlanner() {
        this.logger.log({ op: 'notification.planner.start' });
        const companies = await this.db
            .selectDistinct({ companyId: schema_1.performanceCycles.companyId })
            .from(schema_1.performanceCycles);
        for (const c of companies) {
            try {
                await this.planForCompany(c.companyId);
            }
            catch (e) {
                this.logger.error({
                    op: 'notification.planner.company.failed',
                    companyId: c.companyId,
                    msg: e?.message,
                }, e?.stack);
            }
        }
        this.logger.log({
            op: 'notification.planner.done',
            companies: companies.length,
        });
    }
    async planForCompany(companyId) {
        await this.planGoalReminders(companyId);
        await this.planAssessmentReminders(companyId);
    }
    async planGoalReminders(companyId) {
        const buckets = [
            { bucket: 't7', daysFromNow: 7 },
            { bucket: 't2', daysFromNow: 2 },
            { bucket: 'today', daysFromNow: 0 },
        ];
        for (const b of buckets) {
            const rows = await this.db.execute((0, drizzle_orm_1.sql) `
        SELECT
          g.id AS "goalId",
          g.company_id AS "companyId",
          g.employee_id AS "employeeId",
          e.user_id AS "recipientUserId",
          e.email AS "toEmail",
          COALESCE(u.first_name, '') AS "firstName",
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS "employeeName",
          g.title AS "goalTitle",
          g.due_date AS "dueDate"
        FROM performance_goals g
        JOIN employees e ON e.id = g.employee_id
        JOIN users u ON u.id = e.user_id
        WHERE g.company_id = ${companyId}
          AND g.is_archived = false
          AND g.status IN ('active', 'incomplete') -- adjust to your statuses
          AND g.due_date = (CURRENT_DATE + ${b.daysFromNow} * INTERVAL '1 day')::date
      `);
            const list = rows.rows;
            for (const r of list) {
                const eventType = b.bucket === 't7'
                    ? 'goal_due_t7'
                    : b.bucket === 't2'
                        ? 'goal_due_t2'
                        : 'goal_due_today';
                const dedupeKey = `notif:${companyId}:goal:${r.goalId}:${eventType}:${r.toEmail}`;
                const subject = (0, helper_1.buildGoalSubject)(b.bucket);
                await this.engine.createAndEnqueue({
                    companyId,
                    channel: 'email',
                    eventType,
                    entityType: 'goal',
                    entityId: r.goalId,
                    recipientUserId: r.recipientUserId,
                    recipientEmployeeId: r.employeeId,
                    recipientEmail: r.toEmail,
                    dedupeKey,
                    jobName: 'sendNotificationEvent',
                    payload: {
                        toEmail: r.toEmail,
                        firstName: r.firstName,
                        employeeName: r.employeeName,
                        title: r.goalTitle,
                        dueDate: r.dueDate,
                        subject,
                        companyName: '',
                        meta: {
                            goalId: r.goalId,
                            employeeId: r.employeeId,
                            bucket: b.bucket,
                        },
                    },
                });
            }
        }
        const overdue = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT
        g.id AS "goalId",
        g.company_id AS "companyId",
        g.employee_id AS "employeeId",
        e.user_id AS "recipientUserId",
        e.email AS "toEmail",
        COALESCE(u.first_name, '') AS "firstName",
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS "employeeName",
        g.title AS "goalTitle",
        g.due_date AS "dueDate"
      FROM performance_goals g
      JOIN employees e ON e.id = g.employee_id
      JOIN users u ON u.id = e.user_id
      WHERE g.company_id = ${companyId}
        AND g.is_archived = false
        AND g.status IN ('active', 'incomplete')
        AND g.due_date < CURRENT_DATE
        AND ((CURRENT_DATE - g.due_date) % 3) = 0
    `);
        const overdueList = overdue.rows;
        for (const r of overdueList) {
            const eventType = 'goal_overdue';
            const dedupeKey = `notif:${companyId}:goal:${r.goalId}:${eventType}:${r.toEmail}:d${new Date().toISOString().slice(0, 10)}`;
            await this.engine.createAndEnqueue({
                companyId,
                channel: 'email',
                eventType,
                entityType: 'goal',
                entityId: r.goalId,
                recipientUserId: r.recipientUserId,
                recipientEmployeeId: r.employeeId,
                recipientEmail: r.toEmail,
                dedupeKey,
                jobName: 'sendNotificationEvent',
                payload: {
                    toEmail: r.toEmail,
                    firstName: r.firstName,
                    employeeName: r.employeeName,
                    title: r.goalTitle,
                    dueDate: r.dueDate,
                    companyName: '',
                    meta: {
                        goalId: r.goalId,
                        employeeId: r.employeeId,
                        bucket: 'overdue',
                    },
                },
            });
        }
    }
    async getDefaultTemplateIdOrThrow(companyId) {
        const [tpl] = await this.db
            .select({ id: schema_1.performanceReviewTemplates.id })
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.isDefault, true)))
            .limit(1);
        if (!tpl?.id)
            throw new Error('No default performance review template set.');
        return tpl.id;
    }
    async ensureAssessmentsExistForBuckets(companyId, buckets) {
        const templateId = await this.getDefaultTemplateIdOrThrow(companyId);
        for (const b of buckets) {
            const cycles = await this.db.execute((0, drizzle_orm_1.sql) `
        SELECT c.id AS "cycleId"
        FROM performance_cycles c
        WHERE c.company_id = ${companyId}
          AND c.end_date = (CURRENT_DATE + ${b.daysFromNow} * INTERVAL '1 day')::date
      `);
            const cycleIds = cycles.rows.map((r) => r.cycleId);
            if (!cycleIds.length)
                continue;
            await this.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO performance_assessments
          (company_id, cycle_id, template_id, reviewer_id, reviewee_id, type, status, created_at)
        SELECT
          ${companyId}::uuid,
          c.id::uuid,
          ${templateId}::uuid,
          e.user_id::uuid,
          e.id::uuid,
          'self',
          'not_started',
          NOW()
        FROM performance_cycles c
        JOIN employees e ON e.company_id = c.company_id
        WHERE c.company_id = ${companyId}
          AND c.id = ANY(${drizzle_orm_1.sql.raw(`ARRAY[${cycleIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
          AND e.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM performance_assessments a
            WHERE a.company_id = c.company_id
              AND a.cycle_id = c.id
              AND a.reviewee_id = e.id
              AND a.type = 'self'
          )
      `);
            await this.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO performance_assessments
          (company_id, cycle_id, template_id, reviewer_id, reviewee_id, type, status, created_at)
        SELECT
          ${companyId}::uuid,
          c.id::uuid,
          ${templateId}::uuid,
          mu.id::uuid,
          e.id::uuid,
          'manager',
          'not_started',
          NOW()
        FROM performance_cycles c
        JOIN employees e ON e.company_id = c.company_id
        JOIN employees me ON me.id = e.manager_id
        JOIN users mu ON mu.id = me.user_id
        WHERE c.company_id = ${companyId}
          AND c.id = ANY(${drizzle_orm_1.sql.raw(`ARRAY[${cycleIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
          AND e.manager_id IS NOT NULL
          AND me.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM performance_assessments a
            WHERE a.company_id = c.company_id
              AND a.cycle_id = c.id
              AND a.reviewee_id = e.id
              AND a.type = 'manager'
          )
      `);
        }
    }
    async planAssessmentReminders(companyId) {
        const cycles = await this.getRelevantCycles(companyId);
        await this.ensureAssessmentsExistForCycles(companyId, cycles);
        for (const cycle of cycles) {
            const bucketsToday = this.computeBucketsThatRunToday(cycle);
            if (bucketsToday.length === 0)
                continue;
            for (const b of bucketsToday) {
                const selfRows = await this.fetchSelfDueRows(companyId, cycle.id, b.daysFromNow);
                await this.enqueueDigestNotifications(companyId, b, 'self', selfRows);
                const mgrRows = await this.fetchManagerDueRows(companyId, cycle.id, b.daysFromNow);
                await this.enqueueDigestNotifications(companyId, b, 'manager', mgrRows);
            }
        }
        const overdueRows = await this.fetchOverdueRows(companyId);
        await this.enqueueOverdueDigest(companyId, overdueRows);
    }
    computeBucketsThatRunToday(cycle) {
        const start = new Date(cycle.start_date);
        const end = new Date(cycle.end_date);
        const cycleLenDays = Math.max(1, this.diffDaysUTC(start, end));
        const blueprint = this.bucketsForCycleLength(cycleLenDays);
        const buckets = blueprint.map((p) => ({
            bucket: p.bucket,
            daysFromNow: this.daysFromNowForReminder(end, p.daysBeforeDue),
            eventType: p.eventType,
        }));
        return buckets.filter((b) => b.daysFromNow === 0);
    }
    bucketsForCycleLength(cycleLengthDays) {
        if (cycleLengthDays >= 90) {
            return [
                { bucket: 't30', daysBeforeDue: 30, eventType: 'assessment_t30' },
                { bucket: 't14', daysBeforeDue: 14, eventType: 'assessment_t14' },
                { bucket: 't7', daysBeforeDue: 7, eventType: 'assessment_t7' },
                { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
                {
                    bucket: 'today',
                    daysBeforeDue: 0,
                    eventType: 'assessment_due_today',
                },
            ];
        }
        if (cycleLengthDays >= 45) {
            return [
                { bucket: 't14', daysBeforeDue: 14, eventType: 'assessment_t14' },
                { bucket: 't7', daysBeforeDue: 7, eventType: 'assessment_t7' },
                { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
                {
                    bucket: 'today',
                    daysBeforeDue: 0,
                    eventType: 'assessment_due_today',
                },
            ];
        }
        if (cycleLengthDays >= 21) {
            return [
                { bucket: 't7', daysBeforeDue: 7, eventType: 'assessment_t7' },
                { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
                {
                    bucket: 'today',
                    daysBeforeDue: 0,
                    eventType: 'assessment_due_today',
                },
            ];
        }
        if (cycleLengthDays >= 10) {
            return [
                { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
                {
                    bucket: 'today',
                    daysBeforeDue: 0,
                    eventType: 'assessment_due_today',
                },
            ];
        }
        return [
            { bucket: 'today', daysBeforeDue: 0, eventType: 'assessment_due_today' },
        ];
    }
    daysFromNowForReminder(dueDate, daysBeforeDue) {
        const reminderDate = this.utcDateOnly(dueDate);
        reminderDate.setUTCDate(reminderDate.getUTCDate() - daysBeforeDue);
        const today = this.utcDateOnly(new Date());
        return this.diffDaysUTC(today, reminderDate);
    }
    diffDaysUTC(a, b) {
        const ua = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
        const ub = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
        return Math.round((ub - ua) / (24 * 60 * 60 * 1000));
    }
    utcDateOnly(d) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    async getRelevantCycles(companyId) {
        const res = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, name, start_date, end_date
      FROM performance_cycles
      WHERE company_id = ${companyId}
        AND end_date >= (CURRENT_DATE - INTERVAL '365 days')::date
        AND end_date <= (CURRENT_DATE + INTERVAL '90 days')::date
      ORDER BY end_date DESC
    `);
        return (res.rows ?? []);
    }
    async ensureAssessmentsExistForCycles(companyId, cycles) {
        return;
    }
    async fetchSelfDueRows(companyId, cycleId, daysFromNow) {
        const res = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT
        a.id AS "assessmentId",
        a.reviewee_id AS "employeeId",
        e.user_id AS "recipientUserId",
        e.email AS "toEmail",
        COALESCE(u.first_name, '') AS "firstName",
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS "employeeName",
        NULL::text AS "reviewerName",
        c.id AS "cycleId",
        c.name AS "cycleName",
        c.end_date AS "dueDate",
        'self'::text AS "type"
      FROM performance_assessments a
      JOIN performance_cycles c ON c.id = a.cycle_id
      JOIN employees e ON e.id = a.reviewee_id
      JOIN users u ON u.id = e.user_id
      WHERE a.company_id = ${companyId}
        AND a.cycle_id = ${cycleId}
        AND a.type = 'self'
        AND a.status <> 'submitted'
        AND c.end_date = (CURRENT_DATE + ${daysFromNow} * INTERVAL '1 day')::date
    `);
        return (res.rows ?? []);
    }
    async fetchManagerDueRows(companyId, cycleId, daysFromNow) {
        const res = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT
        m.id AS "assessmentId",
        m.reviewee_id AS "employeeId",
        mu.id AS "recipientUserId",
        mu.email AS "toEmail",
        COALESCE(mu.first_name, '') AS "firstName",
        CONCAT(COALESCE(eu.first_name, ''), ' ', COALESCE(eu.last_name, '')) AS "employeeName",
        CONCAT(COALESCE(mu.first_name, ''), ' ', COALESCE(mu.last_name, '')) AS "reviewerName",
        c.id AS "cycleId",
        c.name AS "cycleName",
        c.end_date AS "dueDate",
        'manager'::text AS "type"
      FROM performance_assessments m
      JOIN performance_cycles c ON c.id = m.cycle_id
      JOIN employees e ON e.id = m.reviewee_id
      JOIN users eu ON eu.id = e.user_id
      JOIN employees me ON me.id = e.manager_id
      JOIN users mu ON mu.id = me.user_id
      WHERE m.company_id = ${companyId}
        AND m.cycle_id = ${cycleId}
        AND m.type = 'manager'
        AND m.status <> 'submitted'
        AND c.end_date = (CURRENT_DATE + ${daysFromNow} * INTERVAL '1 day')::date
        AND EXISTS (
          SELECT 1
          FROM performance_assessments s
          WHERE s.company_id = m.company_id
            AND s.cycle_id = m.cycle_id
            AND s.reviewee_id = m.reviewee_id
            AND s.type = 'self'
            AND s.status = 'submitted'
        )
    `);
        return (res.rows ?? []);
    }
    async fetchOverdueRows(companyId) {
        const res = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT
        a.id AS "assessmentId",
        a.type AS "type",
        a.reviewee_id AS "employeeId",
        c.id AS "cycleId",
        c.name AS "cycleName",
        c.end_date AS "dueDate",
        CASE
          WHEN a.type = 'self' THEN eu.email
          ELSE mu.email
        END AS "toEmail",
        CASE
          WHEN a.type = 'self' THEN COALESCE(eu.first_name, '')
          ELSE COALESCE(mu.first_name, '')
        END AS "firstName",
        CONCAT(COALESCE(eu.first_name, ''), ' ', COALESCE(eu.last_name, '')) AS "employeeName",
        CASE
          WHEN a.type = 'self' THEN NULL
          ELSE CONCAT(COALESCE(mu.first_name, ''), ' ', COALESCE(mu.last_name, ''))
        END AS "reviewerName",
        CASE
          WHEN a.type = 'self' THEN e.user_id
          ELSE mu.id
        END AS "recipientUserId"
      FROM performance_assessments a
      JOIN performance_cycles c ON c.id = a.cycle_id
      JOIN employees e ON e.id = a.reviewee_id
      JOIN users eu ON eu.id = e.user_id
      LEFT JOIN employees me ON me.id = e.manager_id
      LEFT JOIN users mu ON mu.id = me.user_id
      WHERE a.company_id = ${companyId}
        AND a.status <> 'submitted'
        AND c.end_date < CURRENT_DATE
        AND (
          a.type = 'self'
          OR (
            a.type = 'manager'
            AND EXISTS (
              SELECT 1 FROM performance_assessments s
              WHERE s.company_id = a.company_id
                AND s.cycle_id = a.cycle_id
                AND s.reviewee_id = a.reviewee_id
                AND s.type = 'self'
                AND s.status = 'submitted'
            )
          )
        )
    `);
        return (res.rows ?? []);
    }
    async enqueueDigestNotifications(companyId, bucket, type, rows) {
        if (!rows.length)
            return;
        const groups = this.groupForDigest(rows, bucket, type);
        for (const [key, items] of groups.entries()) {
            const first = items[0];
            const dedupeKey = this.digestDedupeKey(companyId, bucket.eventType, type, first.toEmail, first.cycleId);
            await this.engine.createAndEnqueue({
                companyId,
                channel: 'email',
                eventType: bucket.eventType,
                entityType: 'cycle',
                entityId: first.cycleId,
                recipientUserId: first.recipientUserId,
                recipientEmployeeId: first.employeeId,
                recipientEmail: first.toEmail,
                dedupeKey,
                jobName: 'sendNotificationEvent',
                payload: {
                    toEmail: first.toEmail,
                    firstName: first.firstName,
                    cycleName: first.cycleName,
                    dueDate: first.dueDate,
                    companyName: '',
                    assessments: items.map((it) => ({
                        assessmentId: it.assessmentId,
                        employeeId: it.employeeId,
                        employeeName: it.employeeName,
                        reviewerName: it.reviewerName,
                        type: it.type,
                    })),
                    meta: {
                        digest: true,
                        bucket: bucket.bucket,
                        type,
                        cycleId: first.cycleId,
                    },
                },
            });
        }
    }
    async enqueueOverdueDigest(companyId, rows) {
        if (!rows.length)
            return;
        const eventType = 'assessment_overdue';
        const groups = this.groupOverdueForDigest(rows);
        for (const [key, items] of groups.entries()) {
            const first = items[0];
            const dedupeKey = `notif:${companyId}:assessment:digest:${eventType}:${first.toEmail.toLowerCase()}:d${this.todayIsoUTC()}`;
            await this.engine.createAndEnqueue({
                companyId,
                channel: 'email',
                eventType,
                entityType: 'assessment',
                entityId: companyId,
                recipientUserId: first.recipientUserId,
                recipientEmployeeId: first.employeeId,
                recipientEmail: first.toEmail,
                dedupeKey,
                jobName: 'sendNotificationEvent',
                payload: {
                    toEmail: first.toEmail,
                    firstName: first.firstName,
                    companyName: '',
                    assessments: items.map((it) => ({
                        assessmentId: it.assessmentId,
                        employeeId: it.employeeId,
                        employeeName: it.employeeName,
                        reviewerName: it.reviewerName,
                        cycleId: it.cycleId,
                        cycleName: it.cycleName,
                        dueDate: it.dueDate,
                        type: it.type,
                    })),
                    meta: {
                        digest: true,
                        bucket: 'overdue',
                    },
                },
            });
        }
    }
    groupForDigest(rows, bucket, type) {
        const map = new Map();
        for (const r of rows) {
            const key = [
                bucket.eventType,
                type,
                r.toEmail.toLowerCase(),
                r.cycleId,
                new Date(r.dueDate).toISOString().slice(0, 10),
            ].join('|');
            const list = map.get(key) ?? [];
            list.push(r);
            map.set(key, list);
        }
        return map;
    }
    groupOverdueForDigest(rows) {
        const map = new Map();
        for (const r of rows) {
            const key = [
                'assessment_overdue',
                r.toEmail.toLowerCase(),
                this.todayIsoUTC(),
            ].join('|');
            const list = map.get(key) ?? [];
            list.push(r);
            map.set(key, list);
        }
        return map;
    }
    digestDedupeKey(companyId, eventType, type, toEmail, cycleId) {
        return `notif:${companyId}:assessment:digest:${eventType}:${type}:${toEmail.toLowerCase()}:${cycleId}:d${this.todayIsoUTC()}`;
    }
    todayIsoUTC() {
        return new Date().toISOString().slice(0, 10);
    }
};
exports.NotificationPlannerCron = NotificationPlannerCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationPlannerCron.prototype, "runDailyPlanner", null);
exports.NotificationPlannerCron = NotificationPlannerCron = NotificationPlannerCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, notification_engine_service_1.NotificationEngineService])
], NotificationPlannerCron);
//# sourceMappingURL=notification-planner.cron.js.map