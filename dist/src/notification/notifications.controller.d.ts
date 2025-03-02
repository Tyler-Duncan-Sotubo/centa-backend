import { PusherService } from './services/pusher.service';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
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
        created_at: Date;
        updated_at: Date;
    }[]>;
    markAsRead(id: string): Promise<QueryResult<import("drizzle-orm").Assume<this["row"], QueryResultRow>>>;
}
