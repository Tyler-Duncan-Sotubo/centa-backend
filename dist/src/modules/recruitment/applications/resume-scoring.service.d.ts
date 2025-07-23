import { db } from 'src/drizzle/types/drizzle';
interface JobDescription {
    title: string;
    responsibilities: string[] | null;
    requirements: string[] | null;
}
export declare class ResumeScoringService {
    private readonly db;
    private openai;
    constructor(db: db);
    analyzeResumeFromUrl(pdfUrl: string | undefined, job: JobDescription, applicationId: string): Promise<{
        score: number;
        strengths: string[];
        weaknesses: string[];
    } | undefined>;
    private extractPdfTextFromUrl;
    private buildPrompt;
    private safeParseJSON;
}
export {};
