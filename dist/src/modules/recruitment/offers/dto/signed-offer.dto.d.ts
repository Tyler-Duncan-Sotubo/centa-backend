declare class SignedFileDto {
    name: string;
    type: string;
    base64: string;
}
export declare class SignOfferDto {
    offerId: string;
    candidateId: string;
    signedFile: SignedFileDto;
    candidateFullName: string;
}
export {};
