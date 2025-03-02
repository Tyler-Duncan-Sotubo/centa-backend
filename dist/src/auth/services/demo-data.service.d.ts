import { db } from '../../drizzle/types/drizzle';
export declare class DemoDataService {
    private db;
    constructor(db: db);
    private generateEmployee;
    private groupData;
    private departmentData;
    seedDemoData(user_id: string, company_id: string): Promise<void>;
}
