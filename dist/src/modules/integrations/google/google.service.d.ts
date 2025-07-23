import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { db } from 'src/drizzle/types/drizzle';
export declare class GoogleService {
    private readonly db;
    constructor(db: db);
    create(createGoogleDto: CreateGoogleDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiryDate: Date;
        accessToken: string;
        refreshToken: string;
        googleEmail: string;
        tokenType: string;
        scope: string;
        refreshTokenExpiry: number | null;
    }>;
    findOne(userId: string): Promise<{
        id: string;
        userId: string;
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
    update(userId: string, updateGoogleDto: UpdateGoogleDto): Promise<{
        id: string;
        userId: string;
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
