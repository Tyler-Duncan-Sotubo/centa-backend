import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class GoogleService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    private tags;
    create(createGoogleDto: CreateGoogleDto, user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        googleEmail: string;
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        scope: string;
        expiryDate: Date;
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
    update(user: User, updateGoogleDto: UpdateGoogleDto): Promise<{
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
