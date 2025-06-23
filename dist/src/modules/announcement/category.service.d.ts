import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class CategoryService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
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
    listCategories(companyId: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        createdAt: Date | null;
    }[]>;
}
