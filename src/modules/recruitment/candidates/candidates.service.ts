import { Inject, Injectable } from '@nestjs/common';
import { candidate_skills, candidates, skills } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, ilike, or, asc, desc } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';

interface FindCandidatesOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable()
export class CandidatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is "global" here since we don't get a companyId
    return [`company:${scope}:candidates`, `company:${scope}:candidates:list`];
  }

  // READ (cached, global scope; key includes filters & sorting)
  async findAll(options: FindCandidatesOptions = {}) {
    const {
      search,
      limit = 10,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = options;

    const cacheKey = [
      'candidates',
      'list',
      JSON.stringify({
        search: search ?? '',
        limit,
        offset,
        sortBy,
        sortDirection,
      }),
    ];

    return this.cache.getOrSetVersioned(
      'global',
      cacheKey,
      async () => {
        // Safe sort column mapping
        const sortColumnMap: Record<string, any> = {
          name: candidates.fullName,
          email: candidates.email,
          createdAt: candidates.createdAt, // ensure this exists in your schema
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
          .offset(offset)
          .execute();

        // Group by candidate
        const resultMap = new Map<
          string,
          {
            id: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            resumeUrl: string | null;
            profile: unknown;
            skills: string[];
          }
        >();

        for (const row of rows) {
          if (!resultMap.has(row.id)) {
            resultMap.set(row.id, {
              id: row.id,
              name: row.name,
              email: row.email,
              phone: row.phone,
              resumeUrl: row.resumeUrl,
              profile: row.profile,
              skills: [],
            });
          }
          if (row.skillName) {
            resultMap.get(row.id)!.skills.push(row.skillName);
          }
        }

        return Array.from(resultMap.values());
      },
      { tags: this.tags('global') },
    );
  }

  // Keeping as-is; if you want caching here, add a company-aware or global key
  findOne(id: number) {
    return `This action returns a #${id} candidate`;
  }
}
