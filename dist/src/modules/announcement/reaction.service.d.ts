import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
import { ReactionType } from './types/reaction-types';
export declare class ReactionService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private reactionsCacheKey;
    private reactionCountsKey;
    reactToAnnouncement(announcementId: string, reactionType: ReactionType, user: {
        id: string;
    }): Promise<{
        id: string;
        announcementId: string;
        createdBy: string;
        reactionType: string;
        createdAt: Date | null;
    }>;
    getReactions(announcementId: string): Promise<{
        id: string;
        announcementId: string;
        createdBy: string;
        reactionType: string;
        createdAt: Date | null;
    }[]>;
    countReactionsByType(announcementId: string): Promise<{
        reactionType: string;
        count: number;
    }[]>;
    hasUserReacted(announcementId: string, userId: string): Promise<boolean>;
}
