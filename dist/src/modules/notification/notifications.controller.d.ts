import { PusherService } from './services/pusher.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class NotificationController extends BaseController {
    private pusher;
    constructor(pusher: PusherService);
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
}
