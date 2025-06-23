import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
export declare class PusherService {
    private config;
    private db;
    private pusher;
    constructor(config: ConfigService, db: db);
    triggerEvent(channel: string, event: string, data: any): Promise<void>;
    createNotification(company_id: string, message: string, type: string): Promise<{
        id: string;
        message: string;
        url: string;
    }[]>;
    createEmployeeNotification(companyId: string, employeeId: string, message: string, type: string): Promise<{
        id: string;
        message: string;
        url: string;
    }>;
    getUserNotifications(company_id: string): Promise<{
        id: string;
        message: string;
        type: string;
        read: string;
        url: string;
        company_id: string;
        employee_id: string | null;
        created_at: Date;
        updatedAt: Date;
    }[]>;
    getEmployeeNotifications(company_id: string, employeeId: string): Promise<{
        id: string;
        message: string;
        type: string;
        read: string;
        url: string;
        company_id: string;
        employee_id: string | null;
        created_at: Date;
        updatedAt: Date;
    }[]>;
    markAsRead(notificationId: string): Promise<QueryResult<import("drizzle-orm").Assume<this["row"], QueryResultRow>>>;
}
