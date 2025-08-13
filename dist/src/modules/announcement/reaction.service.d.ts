import { User } from 'src/common/types/user.type';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
export declare class ReactionService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    reactToAnnouncement(announcementId: string, reactionType: string, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        createdBy: string;
        announcementId: string;
        reactionType: string;
    } | undefined>;
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
