import { User } from 'src/common/types/user.type';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comments.dto';
import { CacheService } from 'src/common/cache/cache.service';
import { ReactionType } from './types/reaction-types';
import { AnnouncementCacheService } from 'src/common/cache/announcement-cache.service';
export declare class CommentService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    private readonly announcementCache;
    constructor(db: db, auditService: AuditService, cache: CacheService, announcementCache: AnnouncementCacheService);
    private commentsKey;
    private reactionCountsKey;
    private invalidateAnnouncementCaches;
    createComment(dto: CreateAnnouncementCommentDto, announcementId: string, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        createdBy: string;
        announcementId: string;
        comment: string;
    }>;
    getComments(announcementId: string, userId: string): Promise<{
        reactions: {
            reactionType: string;
            count: number;
        }[];
        userReactions: string[];
        id: string;
        comment: string;
        createdAt: Date | null;
        createdBy: string;
        avatarUrl: string | null;
    }[]>;
    deleteComment(commentId: string, user: User): Promise<{
        message: string;
    }>;
    toggleCommentReaction(commentId: string, user: User, reactionType: ReactionType): Promise<{
        reacted: boolean;
    }>;
}
