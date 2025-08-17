import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { AddGoalCommentDto } from './dto/add-goal-comment.dto';
import { UploadGoalAttachmentDto } from './dto/upload-goal-attachment.dto';
import { UpdateGoalAttachmentDto } from './dto/update-goal-attachment.dto';
import { AddKrCheckinDto } from './dto/add-kr-checkin.dto';
import { AddObjectiveCheckinDto } from './dto/add-objective-checkin.dto';
export declare class GoalActivityService {
    private readonly db;
    private readonly audit;
    private readonly s3;
    constructor(db: db, audit: AuditService, s3: S3StorageService);
    addKrCheckin(krId: string, dto: AddKrCheckinDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        createdBy: string;
        value: string | null;
        objectiveId: string | null;
        progressPct: number | null;
        keyResultId: string | null;
        note: string | null;
    }>;
    addObjectiveCheckin(objectiveId: string, dto: AddObjectiveCheckinDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        createdBy: string;
        value: string | null;
        objectiveId: string | null;
        progressPct: number | null;
        keyResultId: string | null;
        note: string | null;
    }>;
    updateCheckinNote(updateId: string, note: string, user: User): Promise<{
        id: string;
        objectiveId: string | null;
        keyResultId: string | null;
        value: string | null;
        progressPct: number | null;
        note: string | null;
        createdBy: string;
        createdAt: Date | null;
    }>;
    addComment(user: User, dto: AddGoalCommentDto & {
        objectiveId?: string | null;
        keyResultId?: string | null;
    }): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        comment: string;
        objectiveId: string | null;
        keyResultId: string | null;
        isPrivate: boolean | null;
        authorId: string;
    }>;
    updateComment(commentId: string, user: User, content: string): Promise<{
        id: string;
        objectiveId: string | null;
        keyResultId: string | null;
        authorId: string;
        comment: string;
        isPrivate: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    deleteComment(commentId: string, user: User): Promise<{
        message: string;
    }>;
    uploadAttachment(dto: UploadGoalAttachmentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        fileName: string;
        fileUrl: string;
        comment: string | null;
        objectiveId: string | null;
        keyResultId: string | null;
        uploadedById: string;
    }>;
    updateAttachment(attachmentId: string, user: User, dto: UpdateGoalAttachmentDto): Promise<{
        id: string;
        objectiveId: string | null;
        keyResultId: string | null;
        comment: string | null;
        uploadedById: string;
        fileUrl: string;
        fileName: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    deleteAttachment(attachmentId: string, user: User): Promise<{
        message: string;
    }>;
    private computeKrProgress;
    private recomputeObjectiveScore;
    private ensureObjectiveExists;
    private ensureKrExists;
    private assertXorTarget;
    private getOrCreateFolder;
}
