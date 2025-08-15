import { User } from 'src/common/types/user.type';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ReactionService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private tags;
    private getCompanyIdForAnnouncement;
    reactToAnnouncement(announcementId: string, reactionType: string, user: User): Promise<any>;
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
