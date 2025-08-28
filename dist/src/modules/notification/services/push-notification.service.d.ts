import type { db } from 'src/drizzle/types/drizzle';
import { SendToEmployeeDto } from '../dto/send-to-employee.dto';
export declare class PushNotificationService {
    private db;
    private expo;
    private readonly logger;
    constructor(db: db);
    saveToken(employeeId: string, token: string, companyId: string, meta?: {
        platform?: string;
        deviceId?: string;
        appVersion?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteToken(token: string): Promise<{
        success: boolean;
    }>;
    private getEmployeeUnreadCount;
    createAndSendToEmployee(employeeId: string, dto: SendToEmployeeDto): Promise<{
        id: string;
    }>;
    createAndSendToCompany(companyId: string, dto: SendToEmployeeDto, opts?: {
        employeeIds?: string[];
    }): Promise<{
        created: number;
        sentTo: number;
        recipients: string[];
    }>;
    getNotificationsForEmployee(employeeId: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string | null;
        title: string;
        body: string | null;
        type: string;
        route: string | null;
        data: Record<string, unknown>;
        url: string | null;
        readAt: Date | null;
        deliveredAt: Date | null;
        openedAt: Date | null;
        badgeAtSend: number | null;
        isArchived: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getUnreadCount(employeeId: string): Promise<{
        count: number;
    }>;
    markRead(notificationId: string): Promise<{
        success: boolean;
    }>;
    markAllRead(employeeId: string): Promise<{
        success: boolean;
        unreadCount: number;
    }>;
    archive(notificationId: string, employeeId: string): Promise<{
        success: boolean;
    }>;
    sendPushNotification(employee_id: string, title: string, body: string, data?: Record<string, any>): Promise<void>;
    sendToEmployees(employeeIds: string[], title: string, body: string, data?: Record<string, any>): Promise<void>;
    sendToTokens(tokens: string[], payload: {
        title: string;
        body: string;
        data?: Record<string, any>;
        badge?: number;
    }, audit?: {
        notificationId?: string;
        deviceRows?: {
            id: string;
            token: string;
        }[];
    }): Promise<void>;
    private checkReceiptsAndPrune;
}
