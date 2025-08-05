import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class GoogleService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(createGoogleDto: CreateGoogleDto, user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        expiryDate: Date;
        scope: string;
        accessToken: string;
        refreshToken: string;
        googleEmail: string;
        tokenType: string;
        refreshTokenExpiry: number | null;
    }>;
    findOne(companyId: string): Promise<{
        id: string;
        companyId: string;
        googleEmail: string;
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        scope: string;
        expiryDate: Date;
        refreshTokenExpiry: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(companyId: string, updateGoogleDto: UpdateGoogleDto): Promise<{
        id: string;
        companyId: string;
        googleEmail: string;
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        scope: string;
        expiryDate: Date;
        refreshTokenExpiry: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
