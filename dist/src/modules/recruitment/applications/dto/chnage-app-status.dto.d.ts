export declare class ChangeApplicationStatusDto {
    applicationId: string;
    newStatus: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
    notes?: string;
}
