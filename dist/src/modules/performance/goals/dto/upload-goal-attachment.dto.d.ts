declare class FileDto {
    name: string;
    base64: string;
}
export declare class UploadGoalAttachmentDto {
    objectiveId?: string | null;
    keyResultId?: string | null;
    file: FileDto;
    comment: string;
}
export {};
