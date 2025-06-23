import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
export declare class TokenGeneratorService {
    private readonly configService;
    private readonly jwtService;
    constructor(configService: ConfigService, jwtService: JwtService);
    generateToken(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    generateTempToken(user: any): Promise<string>;
}
