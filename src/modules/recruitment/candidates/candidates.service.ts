import { Inject, Injectable } from '@nestjs/common';
import { candidate_skills, candidates, skills } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, ilike, or, asc, desc } from 'drizzle-orm';

interface FindCandidatesOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable()
export class CandidatesService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {} // Replace 'any' with your actual database type

  async findAll(options: FindCandidatesOptions = {}) {
    const {
      search,
      limit = 10,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = options;

    // Define safe sort column mapping
    const sortColumnMap: Record<string, any> = {
      name: candidates.fullName,
      email: candidates.email,
      createdAt: candidates.createdAt, // ensure this column exists
    };

    const sortColumn = sortColumnMap[sortBy] || candidates.fullName;
    const sortFn = sortDirection === 'desc' ? desc : asc;

    const rows = await this.db
      .select({
        id: candidates.id,
        name: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        profile: candidates.profile,
        skillName: skills.name,
      })
      .from(candidates)
      .leftJoin(
        candidate_skills,
        eq(candidate_skills.candidateId, candidates.id),
      )
      .leftJoin(skills, eq(candidate_skills.skillId, skills.id))
      .where(
        search
          ? or(
              ilike(candidates.fullName, `%${search}%`),
              ilike(candidates.email, `%${search}%`),
              ilike(skills.name, `%${search}%`),
            )
          : undefined,
      )
      .orderBy(sortFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Group by candidate
    const result: Record<number, any> = {};

    for (const row of rows) {
      if (!result[row.id]) {
        result[row.id] = {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          resumeUrl: row.resumeUrl,
          profile: row.profile,
          skills: [],
        };
      }

      if (row.skillName) {
        result[row.id].skills.push(row.skillName);
      }
    }

    return Object.values(result);
  }

  findOne(id: number) {
    return `This action returns a #${id} candidate`;
  }
}
