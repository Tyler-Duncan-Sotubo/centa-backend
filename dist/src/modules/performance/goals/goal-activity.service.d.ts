import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { AddGoalProgressDto } from './dto/add-goal-progress.dto';
import { AddGoalCommentDto } from './dto/add-goal-comment.dto';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { UploadGoalAttachmentDto } from './dto/upload-goal-attachment.dto';
import { UpdateGoalAttachmentDto } from './dto/update-goal-attachment.dto';
export declare class GoalActivityService {
    private readonly db;
    private readonly auditService;
    private readonly s3Service;
    constructor(db: db, auditService: AuditService, s3Service: S3StorageService);
    addProgressUpdate(goalId: string, dto: AddGoalProgressDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        createdBy: string;
        goalId: string;
        progress: number;
        note: string | null;
    }>;
    updateNote(goalId: string, note: string, user: User): Promise<{
        [x: string]: any;
    }>;
    addComment(goalId: string, user: User, dto: AddGoalCommentDto): Promise<{
        message: string;
    }>;
    updateComment(commentId: string, user: User, content: string): Promise<{
        id: string;
        goalId: string;
        authorId: string;
        comment: string;
        isPrivate: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    deleteComment(commentId: string, user: User): Promise<{
        message: string;
    }>;
    uploadGoalAttachment(goalId: string, dto: UploadGoalAttachmentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        fileName: string;
        fileUrl: string;
        comment: string;
        goalId: string;
        uploadedById: string;
    }>;
    updateAttachment(attachmentId: string, user: User, dto: UpdateGoalAttachmentDto): Promise<{
        id: string;
        goalId: string;
        comment: string;
        uploadedById: string;
        fileUrl: string;
        fileName: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    deleteAttachment(attachmentId: string, user: User): Promise<void>;
    private getOrCreateGoalFolder;
}
