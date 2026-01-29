import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CommentService } from './comment.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comments.dto';
import { ReactionService } from './reaction.service';
import { CategoryService } from './category.service';
export declare class AnnouncementController extends BaseController {
    private readonly announcementService;
    private readonly commentService;
    private readonly reactionService;
    private readonly categoryService;
    constructor(announcementService: AnnouncementService, commentService: CommentService, reactionService: ReactionService, categoryService: CategoryService);
    create(createAnnouncementDto: CreateAnnouncementDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        link: string | null;
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
    findAll(user: User): Promise<{
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
    findAllLimitTwo(user: User): Promise<{
        id: string;
        title: string;
        reactionCounts: Record<string, number>;
        commentCount: number;
        publishedAt: Date | null;
        createdBy: string;
        avatarUrl: string | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
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
    update(id: string, updateAnnouncementDto: UpdateAnnouncementDto, user: User): Promise<{
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
    createComment(id: string, createCommentDto: CreateAnnouncementCommentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        createdBy: string;
        announcementId: string;
        comment: string;
    }>;
    reactToComment(id: string, reactionType: string, user: User): Promise<{
        reacted: boolean;
    }>;
    likeAnnouncement(id: string, reactionType: string, user: User): Promise<any>;
    createCategory(name: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string;
    }>;
    updateCategory(id: string, name: string, user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        createdAt: Date | null;
    }>;
    deleteCategory(id: string, user: User): Promise<{
        success: boolean;
    }>;
    listCategories(user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        createdAt: Date | null;
    }[]>;
    getCreateElements(user: User): Promise<{
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
