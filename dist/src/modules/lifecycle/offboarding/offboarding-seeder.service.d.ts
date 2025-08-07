import { db } from 'src/drizzle/types/drizzle';
export declare class OffboardingSeederService {
    private readonly db;
    constructor(db: db);
    seedGlobalOffboardingData(): Promise<void>;
    private seedTypes;
    private seedReasons;
    private seedChecklistItems;
}
