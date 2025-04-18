import { db } from 'src/drizzle/types/drizzle';
export declare class PushNotificationService {
    private db;
    private expo;
    private readonly logger;
    constructor(db: db);
    sendPushNotification(employee_id: string, title: string, body: string, data?: any): Promise<void>;
    saveToken(employee_id: string, token: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
