import { GoogleService } from './google.service';
import { CreateGoogleDto } from './dto/create-google.dto';
import { UpdateGoogleDto } from './dto/update-google.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class GoogleController extends BaseController {
    private readonly googleService;
    constructor(googleService: GoogleService);
    create(createGoogleDto: CreateGoogleDto, user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        expiryDate: Date;
        googleEmail: string;
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        scope: string;
        refreshTokenExpiry: number | null;
    }>;
    findOne(user: User): Promise<{
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
    update(updateGoogleDto: UpdateGoogleDto, user: User): Promise<{
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
