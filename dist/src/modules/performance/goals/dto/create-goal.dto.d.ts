export declare class CreateGoalDto {
    title: string;
    description?: string;
    kpiBased?: boolean;
    dueDate: string;
    startDate: string;
    weight?: number;
    cycleId: string;
    ownerIds: string[];
}
