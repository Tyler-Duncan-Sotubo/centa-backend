import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { User } from 'src/common/types/user.type';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { CommentService } from './comment.service';
import { ReactionService } from './reaction.service';
import { AwsService } from 'src/common/aws/aws.service';
export declare class AnnouncementService {
    private readonly db;
    private readonly auditService;
    private readonly commentService;
    private readonly reactionService;
    private readonly awsService;
    constructor(db: db, auditService: AuditService, commentService: CommentService, reactionService: ReactionService, awsService: AwsService);
    create(dto: CreateAnnouncementDto, user: User): Promise<{
        id: string;
        link: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        createdBy: string;
        departmentId: string | null;
        title: string;
        locationId: string | null;
        body: string;
        image: string | null;
        publishedAt: Date | null;
        expiresAt: Date | null;
        isPublished: boolean | null;
        categoryId: string;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        category: string | null;
        categoryId: string;
        title: string;
        body: string;
        reactionCounts: Record<string, number>;
        commentCount: number;
        publishedAt: Date | null;
        createdBy: string;
        role: string;
        avatarUrl: string | null;
    }[]>;
    findAllLimitTwo(companyId: string): Promise<{
        id: string;
        title: string;
        reactionCounts: Record<string, number>;
        commentCount: number;
        publishedAt: Date | null;
        createdBy: string;
        avatarUrl: string | null;
    }[]>;
    findOne(id: string, userId: string): Promise<{
        announcement: {
            id: string;
            title: string;
            body: string;
            image: string | null;
            link: string | null;
            publishedAt: Date | null;
            expiresAt: Date | null;
            isPublished: boolean | null;
            createdBy: string;
            createdAt: Date | null;
            updatedAt: Date | null;
            departmentId: string | null;
            locationId: string | null;
            categoryId: string;
            companyId: string;
        };
        likeCount: {
            reactionType: string;
            count: number;
        }[];
        likedByCurrentUser: boolean;
        comments: {
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
        }[];
    }>;
    update(id: string, dto: UpdateAnnouncementDto, user: User): Promise<{
        id: string;
        title: string;
        body: string;
        image: string | null;
        link: string | null;
        publishedAt: Date | null;
        expiresAt: Date | null;
        isPublished: boolean | null;
        createdBy: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        departmentId: string | null;
        locationId: string | null;
        categoryId: string;
        companyId: string;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
    getAllCreateElements(companyId: string): Promise<{
        categories: {
            id: string;
            name: string;
        }[];
        departments: ({
            id: any;
            name: any;
        } | {
            id: any;
            name: any;
        })[];
        locations: {
            id: string;
            name: string;
        }[];
    }>;
}
