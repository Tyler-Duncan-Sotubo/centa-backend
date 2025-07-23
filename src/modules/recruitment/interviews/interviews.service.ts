import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
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

@Injectable()
export class InterviewsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async scheduleInterview(dto: ScheduleInterviewDto) {
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
      .returning();

    const assignments = dto.interviewerIds.map((id) => ({
      interviewId: interview.id,
      interviewerId: id,
      scorecardTemplateId: dto.scorecardTemplateId, // Optional scorecard template
    }));

    await this.db.insert(interviewInterviewers).values(assignments);

    return interview;
  }

  async rescheduleInterview(interviewId: string, dto: ScheduleInterviewDto) {
    const [interview] = await this.db
      .update(interviews)
      .set({
        scheduledFor: new Date(dto.scheduledFor),
        durationMins: dto.durationMins,
        stage: dto.stage,
        meetingLink: dto.meetingLink,
        mode: dto.mode,
        eventId: dto.eventId,
      })
      .where(eq(interviews.id, interviewId))
      .returning();

    // Clear existing interviewers and reassign
    await this.db
      .delete(interviewInterviewers)
      .where(eq(interviewInterviewers.interviewId, interviewId));

    const assignments = dto.interviewerIds.map((id) => ({
      interviewId: interview.id,
      interviewerId: id,
      scorecardTemplateId: dto.scorecardTemplateId, // Optional scorecard template
    }));

    await this.db.insert(interviewInterviewers).values(assignments);

    return interview;
  }

  async findAllInterviews(companyId: string) {
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
      .where(eq(job_postings.companyId, companyId));

    if (allInterviews.length === 0) return [];

    const results = await Promise.all(
      allInterviews.map(async ({ interview, candidate }) => {
        // 1. Get interviewer assignments (with scorecardTemplateId)
        const interviewers = await this.db
          .select({
            interviewerId: interviewInterviewers.interviewerId,
            scorecardTemplateId: interviewInterviewers.scorecardTemplateId,
          })
          .from(interviewInterviewers)
          .where(eq(interviewInterviewers.interviewId, interview.id));

        // 2. Collect unique template IDs
        const templateIds = [
          ...new Set(
            interviewers.map((i) => i.scorecardTemplateId).filter(Boolean),
          ),
        ];

        // 3. Fetch criteria across all templates used in this interview
        const criteria =
          templateIds.length > 0
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
                .where(
                  inArray(
                    scorecard_criteria.templateId,
                    templateIds.filter((id): id is string => id !== null),
                  ),
                )
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
          scorecardCriteria: criteria, // or group by templateId if needed
        };
      }),
    );

    return results;
  }

  async getInterviewDetails(interviewId: string) {
    const [interview] = await this.db
      .select()
      .from(interviews)
      .where(eq(interviews.id, interviewId));

    if (!interview) throw new NotFoundException('Interview not found');

    // 1. Get all interviewers (with scorecardTemplateId)
    const interviewers = await this.db
      .select()
      .from(interviewInterviewers)
      .where(eq(interviewInterviewers.interviewId, interviewId));

    // 2. Get unique scorecardTemplateIds
    const templateIds = [
      ...new Set(
        interviewers.map((i) => i.scorecardTemplateId).filter(Boolean),
      ),
    ];

    // 3. Get all criteria grouped by templateId
    const criteria = await this.db
      .select()
      .from(scorecard_criteria)
      .where(
        inArray(
          scorecard_criteria.templateId,
          templateIds.filter((id): id is string => id !== null),
        ),
      );

    // 4. Group criteria by templateId
    const criteriaByTemplate: Record<string, any[]> = {};
    for (const c of criteria) {
      if (!criteriaByTemplate[c.templateId]) {
        criteriaByTemplate[c.templateId] = [];
      }
      criteriaByTemplate[c.templateId].push(c);
    }

    return {
      ...interview,
      interviewers,
      scorecardCriteria: criteriaByTemplate, // { templateId1: [...], templateId2: [...] }
    };
  }

  async listInterviewsForApplication(applicationId: string) {
    return this.db
      .select()
      .from(interviews)
      .where(eq(interviews.applicationId, applicationId))
      .orderBy(interviews.scheduledFor);
  }

  async listInterviewerFeedback(interviewId: string) {
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
      .where(eq(interview_scores.interviewId, interviewId));

    const grouped = {} as Record<
      string,
      {
        scores: typeof scores;
        average: number;
      }
    >;

    let globalTotal = 0;
    let globalCount = 0;

    for (const score of scores) {
      const key = score.submittedBy;
      if (key == null) continue;

      if (!grouped[key]) {
        grouped[key] = {
          scores: [],
          average: 0,
        };
      }

      grouped[key].scores.push(score);

      // Track for overall average
      if (typeof score.score === 'number') {
        globalTotal += score.score;
        globalCount += 1;
      }
    }

    // Compute per-interviewer averages
    for (const key in grouped) {
      const values = grouped[key].scores.map((s) => s.score).filter(Boolean);
      const total = values.reduce((a, b) => a + b, 0);
      const average = values.length > 0 ? total / values.length : 0;
      grouped[key].average = Number(average.toFixed(2));
    }

    const overallAverage =
      globalCount > 0 ? Number((globalTotal / globalCount).toFixed(2)) : 0;

    return {
      feedback: grouped,
      overallAverage,
    };
  }

  async upsertInterviewFeedback(
    interviewId: string,
    scores: FeedbackScoreDto[],
    user: User,
  ) {
    const submittedBy = user.id;

    for (const s of scores) {
      const existing = await this.db
        .select()
        .from(interview_scores)
        .where(
          and(
            eq(interview_scores.interviewId, interviewId),
            eq(interview_scores.criterionId, s.criterionId),
            eq(interview_scores.submittedBy, submittedBy),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // UPDATE
        await this.db
          .update(interview_scores)
          .set({
            score: s.score,
            comment: s.comment,
          })
          .where(
            and(
              eq(interview_scores.interviewId, interviewId),
              eq(interview_scores.criterionId, s.criterionId),
              eq(interview_scores.submittedBy, submittedBy),
            ),
          );
      } else {
        // INSERT
        await this.db.insert(interview_scores).values({
          interviewId,
          criterionId: s.criterionId,
          score: s.score,
          comment: s.comment,
          submittedBy,
        });
      }
    }

    // Log the upsert operation
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

    return { success: true };
  }
}
