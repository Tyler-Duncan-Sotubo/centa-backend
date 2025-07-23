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
exports.ResumeScoringService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
const axios_1 = require("axios");
const pdfParse = require("pdf-parse");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
let ResumeScoringService = class ResumeScoringService {
    constructor(db) {
        this.db = db;
        this.openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async analyzeResumeFromUrl(pdfUrl, job, applicationId) {
        if (!pdfUrl) {
            return {
                score: 50,
                strengths: ['No resume URL provided'],
                weaknesses: ['Resume URL is undefined'],
            };
        }
        const resumeText = await this.extractPdfTextFromUrl(pdfUrl);
        const prompt = this.buildPrompt(resumeText, job);
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
            });
            const response = completion.choices[0].message.content?.trim();
            const parsedResponse = this.safeParseJSON(response);
            await this.db
                .update(schema_1.applications)
                .set({
                resumeScore: parsedResponse,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
                .execute();
        }
        catch (err) {
            console.error('OpenAI error:', err);
            return {
                score: 50,
                strengths: ['Could not analyze properly'],
                weaknesses: ['Failed to parse resume or response'],
            };
        }
    }
    async extractPdfTextFromUrl(url) {
        const response = await axios_1.default.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const parsed = await pdfParse(buffer);
        return parsed.text;
    }
    buildPrompt(resume, job) {
        return `
You're an expert technical recruiter. Evaluate this resume against the job description below.

Job Title: ${job.title}
Responsibilities:
${(job.responsibilities ?? []).join('\n')}

Requirements:
${(job.requirements ?? []).join('\n')}

Resume:
${resume}

Respond with a JSON object in this format:
{
  "score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."]
}
`;
    }
    safeParseJSON(text) {
        try {
            const parsed = JSON.parse(text ?? '');
            if (typeof parsed.score === 'number' &&
                Array.isArray(parsed.strengths) &&
                Array.isArray(parsed.weaknesses)) {
                return parsed;
            }
        }
        catch { }
        return {
            score: 50,
            strengths: ['Parsing failed'],
            weaknesses: ['Invalid JSON from OpenAI'],
        };
    }
};
exports.ResumeScoringService = ResumeScoringService;
exports.ResumeScoringService = ResumeScoringService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ResumeScoringService);
//# sourceMappingURL=resume-scoring.service.js.map