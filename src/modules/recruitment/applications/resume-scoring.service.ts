import { Inject, Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import axios from 'axios';
import * as pdfParse from 'pdf-parse';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { applications } from '../schema';
import { eq } from 'drizzle-orm';

interface JobDescription {
  title: string;
  responsibilities: string[] | null;
  requirements: string[] | null;
}

interface ResumeScoreResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
}

@Injectable()
export class ResumeScoringService {
  private openai: OpenAI;

  constructor(@Inject(DRIZZLE) private readonly db: db) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeResumeFromUrl(
    pdfUrl: string | undefined,
    job: JobDescription,
    applicationId: string,
  ) {
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
        .update(applications)
        .set({
          resumeScore: parsedResponse,
        })
        .where(eq(applications.id, applicationId))
        .execute();
    } catch (err) {
      console.error('OpenAI error:', err);
      return {
        score: 50,
        strengths: ['Could not analyze properly'],
        weaknesses: ['Failed to parse resume or response'],
      };
    }
  }

  private async extractPdfTextFromUrl(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  private buildPrompt(resume: string, job: JobDescription): string {
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

  private safeParseJSON(text: string | undefined): ResumeScoreResult {
    try {
      const parsed = JSON.parse(text ?? '');
      if (
        typeof parsed.score === 'number' &&
        Array.isArray(parsed.strengths) &&
        Array.isArray(parsed.weaknesses)
      ) {
        return parsed;
      }
    } catch {}
    return {
      score: 50,
      strengths: ['Parsing failed'],
      weaknesses: ['Invalid JSON from OpenAI'],
    };
  }
}
