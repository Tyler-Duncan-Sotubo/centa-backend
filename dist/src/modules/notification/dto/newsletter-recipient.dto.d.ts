export declare class SendNewsletterDto {
    recipients: NewsletterRecipientDto[];
}
export declare class NewsletterRecipientDto {
    email: string;
    name: string;
    companyName?: string;
}
