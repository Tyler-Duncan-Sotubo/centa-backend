import { User } from 'src/common/types/user.type';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comments.dto';
export declare class CommentService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
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
    toggleCommentReaction(commentId: string, userId: string, reactionType: string): Promise<{
        reacted: boolean;
    }>;
}
