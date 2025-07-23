export declare class CreateGoogleDto {
    googleEmail: string;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    scope: string;
    expiryDate: Date;
    refreshTokenExpiry?: number;
}
