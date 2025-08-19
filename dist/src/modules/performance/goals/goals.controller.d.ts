import { GoalActivityService } from './goal-activity.service';
import { AddGoalProgressDto } from './dto/add-goal-progress.dto';
import { AddGoalCommentDto } from './dto/add-goal-comment.dto';
import { UploadGoalAttachmentDto } from './dto/upload-goal-attachment.dto';
import { UpdateGoalAttachmentDto } from './dto/update-goal-attachment.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class GoalsController extends BaseController {
    private readonly activityService;
    constructor(activityService: GoalActivityService);
    addProgress(goalId: string, dto: AddGoalProgressDto, user: User): Promise<{
        id: string;
        createdBy: string;
        createdAt: Date | null;
        value: string | null;
        objectiveId: string | null;
        progressPct: number | null;
        keyResultId: string | null;
        note: string | null;
    }>;
    addComment(dto: AddGoalCommentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        comment: string;
        objectiveId: string | null;
        keyResultId: string | null;
        isPrivate: boolean | null;
        authorId: string;
    }>;
    updateComment(commentId: string, content: string, user: User): Promise<{
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
    uploadAttachment(goalId: string, dto: UploadGoalAttachmentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        comment: string | null;
        fileName: string;
        fileUrl: string;
        objectiveId: string | null;
        keyResultId: string | null;
        uploadedById: string;
    }>;
    updateAttachment(attachmentId: string, dto: UpdateGoalAttachmentDto, user: User): Promise<{
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
}
