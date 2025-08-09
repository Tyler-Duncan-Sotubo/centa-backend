import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray, asc } from 'drizzle-orm';
import {
  interviews,
  interviewInterviewers,
  interview_scores,
  scorecard_criteria,
  applications,
  job_postings,
  candidates,
} from '../schema';
import { User } from 'src/common/types/user.type';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { FeedbackScoreDto } from './dto/feedback-score.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class InterviewsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(InterviewsService.name);
  }

  // ---------- cache keys ----------
  private allKey(companyId: string) {
    return `iv:${companyId}:list`;
  }
  private detailKey(interviewId: string) {
    return `iv:${interviewId}:detail`;
  }
  private appListKey(applicationId: string) {
    return `iv:app:${applicationId}:list`;
  }
  private feedbackKey(interviewId: string) {
    return `iv:${interviewId}:feedback`;
  }
  private async burst(opts: {
    companyId?: string;
    interviewId?: string;
    applicationId?: string;
    feedback?: boolean;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.allKey(opts.companyId)));
    if (opts.interviewId) {
      jobs.push(this.cache.del(this.detailKey(opts.interviewId)));
      jobs.push(this.cache.del(this.feedbackKey(opts.interviewId)));
    }
    if (opts.applicationId)
      jobs.push(this.cache.del(this.appListKey(opts.applicationId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:interviews');
  }

  // ---------- schedule / reschedule ----------
  async scheduleInterview(dto: ScheduleInterviewDto, user: User) {
    this.logger.info(
      {
        applicationId: dto.applicationId,
        stage: dto.stage,
        interviewerCount: dto.interviewerIds?.length ?? 0,
      },
      'iv:schedule:start',
    );

    const [interview] = await this.db
      .insert(interviews)
      .values({
        applicationId: dto.applicationId,
        scheduledFor: new Date(dto.scheduledFor),
        durationMins: dto.durationMins,
        stage: dto.stage,
        meetingLink: dto.meetingLink,
        eventId: dto.eventId,
        mode: dto.mode,
        emailTemplateId: dto.emailTemplateId,
      })
      .returning()
      .execute();

    const assignments = (dto.interviewerIds ?? []).map((id) => ({
      interviewId: interview.id,
      interviewerId: id,
      scorecardTemplateId: dto.scorecardTemplateId,
    }));
    if (assignments.length)
      await this.db.insert(interviewInterviewers).values(assignments).execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'interview',
      entityId: interview.id,
      userId: user.id,
      details: 'Interview scheduled',
      changes: { ...dto, interviewId: interview.id },
    });

    // burst caches related to company/app once we can infer them (via application join)
    try {
      const [appRow] = await this.db
        .select({ companyId: job_postings.companyId })
        .from(applications)
        .innerJoin(job_postings, eq(applications.jobId, job_postings.id))
        .where(eq(applications.id, dto.applicationId))
        .execute();
      await this.burst({
        companyId: appRow?.companyId,
        applicationId: dto.applicationId,
      });
    } catch (e: any) {
      this.logger.warn(
        { applicationId: dto.applicationId, error: e.message },
        'iv:schedule:burst:skip',
      );
    }

    this.logger.info({ id: interview.id }, 'iv:schedule:done');
    return interview;
  }

  async rescheduleInterview(
    interviewId: string,
    dto: ScheduleInterviewDto,
    user: User,
  ) {
    this.logger.info({ interviewId }, 'iv:reschedule:start');

    const [interview] = await this.db
      .update(interviews)
      .set({
        scheduledFor: new Date(dto.scheduledFor),
        durationMins: dto.durationMins,
        stage: dto.stage,
        meetingLink: dto.meetingLink,
        mode: dto.mode,
        eventId: dto.eventId,
        emailTemplateId: dto.emailTemplateId ?? undefined,
      })
      .where(eq(interviews.id, interviewId))
      .returning()
      .execute();

    await this.db
      .delete(interviewInterviewers)
      .where(eq(interviewInterviewers.interviewId, interviewId))
      .execute();

    const assignments = (dto.interviewerIds ?? []).map((id) => ({
      interviewId: interview.id,
      interviewerId: id,
      scorecardTemplateId: dto.scorecardTemplateId,
    }));
    if (assignments.length)
      await this.db.insert(interviewInterviewers).values(assignments).execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'interview',
      entityId: interviewId,
      userId: user.id,
      details: 'Interview rescheduled',
      changes: { ...dto },
    });

    try {
      const [appRow] = await this.db
        .select({
          applicationId: interviews.applicationId,
          companyId: job_postings.companyId,
        })
        .from(interviews)
        .innerJoin(applications, eq(interviews.applicationId, applications.id))
        .innerJoin(job_postings, eq(applications.jobId, job_postings.id))
        .where(eq(interviews.id, interviewId))
        .execute();
      await this.burst({
        companyId: appRow?.companyId,
        applicationId: appRow?.applicationId,
        interviewId,
      });
    } catch (e) {
      this.logger.warn(
        { interviewId, error: e.message },
        'iv:reschedule:burst:skip',
      );
    }

    this.logger.info({ interviewId }, 'iv:reschedule:done');
    return interview;
  }

  // ---------- reads (cached) ----------
  async findAllInterviews(companyId: string) {
    const key = this.allKey(companyId);
    this.logger.debug({ key, companyId }, 'iv:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const allInterviews = await this.db
        .select({
          interview: interviews,
          application: applications,
          job: job_postings,
          candidate: candidates,
        })
        .from(interviews)
        .innerJoin(applications, eq(interviews.applicationId, applications.id))
        .innerJoin(job_postings, eq(applications.jobId, job_postings.id))
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(eq(job_postings.companyId, companyId))
        .execute();

      if (allInterviews.length === 0) return [] as any[];

      const results = await Promise.all(
        allInterviews.map(async ({ interview, candidate }) => {
          const interviewers = await this.db
            .select({
              interviewerId: interviewInterviewers.interviewerId,
              scorecardTemplateId: interviewInterviewers.scorecardTemplateId,
            })
            .from(interviewInterviewers)
            .where(eq(interviewInterviewers.interviewId, interview.id))
            .execute();

          const templateIds = [
            ...new Set(
              interviewers.map((i) => i.scorecardTemplateId).filter(Boolean),
            ),
          ] as string[];
          const criteria = templateIds.length
            ? await this.db
                .select({
                  id: scorecard_criteria.id,
                  label: scorecard_criteria.label,
                  description: scorecard_criteria.description,
                  maxScore: scorecard_criteria.maxScore,
                  order: scorecard_criteria.order,
                  templateId: scorecard_criteria.templateId,
                })
                .from(scorecard_criteria)
                .where(inArray(scorecard_criteria.templateId, templateIds))
                .orderBy(asc(scorecard_criteria.order))
                .execute()
            : [];

          return {
            id: interview.id,
            applicationId: interview.applicationId,
            scheduledFor: interview.scheduledFor,
            durationMins: interview.durationMins,
            stage: interview.stage,
            mode: interview.mode,
            meetingLink: interview.meetingLink,
            candidateName: candidate.fullName,
            interviewers,
            scorecardCriteria: criteria,
          };
        }),
      );

      this.logger.debug(
        { companyId, count: results.length },
        'iv:list:db:done',
      );
      return results;
    });
  }

  async getInterviewDetails(interviewId: string) {
    const key = this.detailKey(interviewId);
    this.logger.debug({ key, interviewId }, 'iv:detail:cache:get');

    const payload = await this.cache.getOrSetCache(key, async () => {
      const [interview] = await this.db
        .select()
        .from(interviews)
        .where(eq(interviews.id, interviewId))
        .execute();
      if (!interview) return null;

      const interviewers = await this.db
        .select()
        .from(interviewInterviewers)
        .where(eq(interviewInterviewers.interviewId, interviewId))
        .execute();
      const templateIds = [
        ...new Set(
          interviewers.map((i) => i.scorecardTemplateId).filter(Boolean),
        ),
      ] as string[];

      const criteria = templateIds.length
        ? await this.db
            .select()
            .from(scorecard_criteria)
            .where(inArray(scorecard_criteria.templateId, templateIds))
            .orderBy(asc(scorecard_criteria.order))
            .execute()
        : [];

      const criteriaByTemplate: Record<string, any[]> = {};
      for (const c of criteria) {
        if (!criteriaByTemplate[c.templateId])
          criteriaByTemplate[c.templateId] = [];
        criteriaByTemplate[c.templateId].push(c);
      }

      return {
        ...interview,
        interviewers,
        scorecardCriteria: criteriaByTemplate,
      };
    });

    if (!payload) {
      this.logger.warn({ interviewId }, 'iv:detail:not-found');
      throw new NotFoundException('Interview not found');
    }

    return payload;
  }

  async listInterviewsForApplication(applicationId: string) {
    const key = this.appListKey(applicationId);
    this.logger.debug({ key, applicationId }, 'iv:appList:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(interviews)
        .where(eq(interviews.applicationId, applicationId))
        .orderBy(asc(interviews.scheduledFor))
        .execute();
      this.logger.debug(
        { applicationId, count: rows.length },
        'iv:appList:db:done',
      );
      return rows;
    });
  }

  async listInterviewerFeedback(interviewId: string) {
    const key = this.feedbackKey(interviewId);
    this.logger.debug({ key, interviewId }, 'iv:feedback:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const scores = await this.db
        .select({
          id: interview_scores.id,
          interviewId: interview_scores.interviewId,
          criterionId: interview_scores.criterionId,
          score: interview_scores.score,
          comment: interview_scores.comment,
          submittedBy: interview_scores.submittedBy,
        })
        .from(interview_scores)
        .where(eq(interview_scores.interviewId, interviewId))
        .execute();

      const grouped: Record<
        string,
        { scores: typeof scores; average: number }
      > = {};
      let globalTotal = 0;
      let globalCount = 0;

      for (const s of scores) {
        const key = s.submittedBy as string | null;
        if (!key) continue;
        if (!grouped[key]) grouped[key] = { scores: [], average: 0 };
        grouped[key].scores.push(s);
        if (typeof s.score === 'number') {
          globalTotal += s.score;
          globalCount += 1;
        }
      }

      for (const k in grouped) {
        const values = grouped[k].scores
          .map((s) => s.score)
          .filter((v): v is number => typeof v === 'number');
        const total = values.reduce((a, b) => a + b, 0);
        grouped[k].average = values.length
          ? Number((total / values.length).toFixed(2))
          : 0;
      }

      const overallAverage = globalCount
        ? Number((globalTotal / globalCount).toFixed(2))
        : 0;
      return { feedback: grouped, overallAverage };
    });
  }

  async upsertInterviewFeedback(
    interviewId: string,
    scores: FeedbackScoreDto[],
    user: User,
  ) {
    this.logger.info(
      { interviewId, count: scores?.length ?? 0, userId: user.id },
      'iv:feedback:upsert:start',
    );

    const submittedBy = user.id;

    for (const s of scores) {
      const existing = await this.db
        .select({ id: interview_scores.id })
        .from(interview_scores)
        .where(
          and(
            eq(interview_scores.interviewId, interviewId),
            eq(interview_scores.criterionId, s.criterionId),
            eq(interview_scores.submittedBy, submittedBy),
          ),
        )
        .limit(1)
        .execute();

      if (existing.length > 0) {
        await this.db
          .update(interview_scores)
          .set({ score: s.score, comment: s.comment })
          .where(
            and(
              eq(interview_scores.interviewId, interviewId),
              eq(interview_scores.criterionId, s.criterionId),
              eq(interview_scores.submittedBy, submittedBy),
            ),
          )
          .execute();
      } else {
        await this.db
          .insert(interview_scores)
          .values({
            interviewId,
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment,
            submittedBy,
          })
          .execute();
      }
    }

    await this.auditService.logAction({
      action: 'upsert',
      entity: 'interview_feedback',
      entityId: interviewId,
      userId: submittedBy,
      details: `Upserted feedback for interview ${interviewId}`,
      changes: {
        interviewId,
        scores: scores.map((s) => ({
          criterionId: s.criterionId,
          score: s.score,
          comment: s.comment,
        })),
      },
    });

    await this.burst({ interviewId });
    this.logger.info({ interviewId }, 'iv:feedback:upsert:done');
    return { success: true };
  }
}
