"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationStyleEnum = exports.employmentTypeEnum = exports.jobTypeEnum = exports.applicationSourceEnum = exports.OfferStatus = exports.CandidateSource = exports.InterviewStage = exports.AppStatus = exports.JobStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.JobStatus = (0, pg_core_1.pgEnum)('job_status', [
    'draft',
    'open',
    'closed',
    'archived',
]);
exports.AppStatus = (0, pg_core_1.pgEnum)('application_status', [
    'applied',
    'screening',
    'interview',
    'offer',
    'hired',
    'rejected',
]);
exports.InterviewStage = (0, pg_core_1.pgEnum)('interview_stage', [
    'phone_screen',
    'tech',
    'onsite',
    'final',
]);
exports.CandidateSource = (0, pg_core_1.pgEnum)('candidate_source', [
    'job_board',
    'referral',
    'agency',
    'career_page',
    'headhunter',
    'other',
]);
exports.OfferStatus = (0, pg_core_1.pgEnum)('offer_status', [
    'pending',
    'accepted',
    'declined',
    'expired',
]);
exports.applicationSourceEnum = (0, pg_core_1.pgEnum)('application_source', [
    'career_page',
    'linkedin',
    'indeed',
    'referral',
    'agency',
    'internal',
    'other',
]);
exports.jobTypeEnum = (0, pg_core_1.pgEnum)('job_type', ['onsite', 'remote', 'hybrid']);
exports.employmentTypeEnum = (0, pg_core_1.pgEnum)('employment_type', [
    'permanent',
    'temporary',
    'contract',
    'internship',
    'freelance',
    'part_time',
    'full_time',
]);
exports.applicationStyleEnum = (0, pg_core_1.pgEnum)('application_style', [
    'resume_only',
    'form_only',
    'both',
]);
//# sourceMappingURL=recruitment-enums.schema.js.map