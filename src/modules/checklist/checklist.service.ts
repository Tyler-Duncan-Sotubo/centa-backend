import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { sql } from 'drizzle-orm';
import { checklistCompletion } from './schema/checklist.schema';
import { ExtraKeyParamDto } from './dto/extra-key.param';

@Injectable()
export class ChecklistService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  /** Mark an extra staff item done (idempotent upsert). */
  async markExtraDone(
    companyId: string,
    key: ExtraKeyParamDto['key'],
    userId: string,
  ) {
    await this.db
      .insert(checklistCompletion)
      .values({ companyId, checklistKey: key, completedBy: userId })
      .onConflictDoUpdate({
        // requires a unique index on (companyId, checklistKey)
        target: [
          checklistCompletion.companyId,
          checklistCompletion.checklistKey,
        ],
        set: {
          completedBy: sql`EXCLUDED.completed_by`,
          completedAt: sql`now()`,
        },
      });
  }
}
