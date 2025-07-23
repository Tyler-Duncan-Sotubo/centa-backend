import { pgEnum } from 'drizzle-orm/pg-core';

export const JobStatus = pgEnum('job_status', [
  'draft',
  'open',
  'closed',
  'archived',
]);
export const AppStatus = pgEnum('application_status', [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
]);
export const InterviewStage = pgEnum('interview_stage', [
  'phone_screen',
  'tech',
  'onsite',
  'final',
]);
export const CandidateSource = pgEnum('candidate_source', [
  'job_board',
  'referral',
  'agency',
  'career_page',
  'headhunter',
  'other',
]);
export const OfferStatus = pgEnum('offer_status', [
  'pending',
  'accepted',
  'declined',
  'expired',
]);

export const applicationSourceEnum = pgEnum('application_source', [
  'career_page',
  'linkedin',
  'indeed',
  'referral',
  'agency',
  'internal',
  'other',
]);

export const jobTypeEnum = pgEnum('job_type', ['onsite', 'remote', 'hybrid']);

export const employmentTypeEnum = pgEnum('employment_type', [
  'permanent',
  'temporary',
  'contract',
  'internship',
  'freelance',
  'part_time',
  'full_time',
]);

export const applicationStyleEnum = pgEnum('application_style', [
  'resume_only',
  'form_only',
  'both',
]);
