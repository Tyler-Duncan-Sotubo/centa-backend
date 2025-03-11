import { db } from 'src/drizzle/types/drizzle';
export declare class OnboardingService {
    private db;
    constructor(db: db);
    defaultTasks: {
        taskKey: string;
        url: string;
    }[];
    createOnboardingTasks(companyId: string): Promise<void>;
    completeTask(companyId: string, taskKey: string): Promise<void>;
    getOnboardingTasks(companyId: string): Promise<{
        id: string;
        companyId: string;
        taskKey: string;
        completed: boolean;
        url: string;
        completedAt: Date | null;
    }[]>;
}
