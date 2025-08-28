import { PusherService } from './services/pusher.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { PushNotificationService } from './services/push-notification.service';
import { SendToEmployeeDto } from './dto/send-to-employee.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
export declare class NotificationController extends BaseController {
    private pusher;
    private push;
    constructor(pusher: PusherService, push: PushNotificationService);
    getUserNotifications(user: User): Promise<{
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
    getEmployeeNotifications(user: User, employeeId: string): Promise<{
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
    markAsRead(id: string): Promise<QueryResult<import("drizzle-orm").Assume<this["row"], QueryResultRow>>>;
    registerDevice(id: string, dto: RegisterDeviceDto, user: User): Promise<{
        status: string;
    }>;
    unregisterDevice(token: string): Promise<{
        status: string;
    }>;
    sendToEmployee(employeeId: string, dto: SendToEmployeeDto): Promise<{
        status: string;
    }>;
    getUnreadCount(employeeId: string): Promise<{
        count: number;
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
    markRead(id: string): Promise<{
        success: boolean;
    }>;
}
