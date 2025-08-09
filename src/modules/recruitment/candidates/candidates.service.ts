import { Inject, Injectable } from '@nestjs/common';
import { candidate_skills, candidates, skills } from '../schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, ilike, or, asc, desc } from 'drizzle-orm';
import { PinoLogger } from 'nestjs-pino';
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
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(CandidatesService.name);
  }

  // -------- cache keys --------
  private listKey(opts: FindCandidatesOptions) {
    const {
      search = '',
      limit = 10,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = opts || {};
    return `candidates:list:search=${encodeURIComponent(search)}:sort=${sortBy}:${sortDirection}:limit=${limit}:offset=${offset}`;
  }
  private oneKey(id: string) {
    return `candidates:detail:${id}`;
  }

  // -------- reads (cached) --------
  async findAll(options: FindCandidatesOptions = {}) {
    const key = this.listKey(options);
    this.logger.debug({ key, ...options }, 'candidates:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
        createdAt: candidates.createdAt,
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
      const result: Record<string, any> = {};
      for (const row of rows) {
        const id = String(row.id);
        if (!result[id]) {
          result[id] = {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            resumeUrl: row.resumeUrl,
            profile: row.profile,
            skills: [] as string[],
          };
        }
        if (row.skillName) result[id].skills.push(row.skillName);
      }

      const out = Object.values(result);
      this.logger.debug({ count: out.length }, 'candidates:list:db:done');
      return out;
    });
  }

  async findOne(id: string) {
    const key = this.oneKey(id);
    this.logger.debug({ key, id }, 'candidates:detail:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [row] = await this.db
        .select({
          id: candidates.id,
          name: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          resumeUrl: candidates.resumeUrl,
          profile: candidates.profile,
        })
        .from(candidates)
        .where(eq(candidates.id, id))
        .execute();
      return row ?? null;
    });
  }
}
