export declare class CreateGoalDto {
    status?: string;
    title: string;
    description?: string;
    cycleId?: string;
    startDate?: string;
    dueDate?: string;
    weight?: number;
    groupId?: string | null;
    employeeId?: string | null;
    isRecurring?: boolean;
}
