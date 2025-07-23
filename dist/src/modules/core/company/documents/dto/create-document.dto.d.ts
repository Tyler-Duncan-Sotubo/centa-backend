declare class DocumentFileDto {
    name: string;
    type: string;
    base64: string;
}
export declare class CreateDocumentDto {
    folderId: string;
    type: string;
    category: string;
    file: DocumentFileDto;
}
export {};
