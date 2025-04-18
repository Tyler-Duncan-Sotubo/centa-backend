import { PusherService } from './services/pusher.service';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
import { ChatbotService } from './services/chatbot.service';
import { PushNotificationService } from './services/push-notification.service';
export declare class NotificationController extends BaseController {
    private pusher;
    private readonly chatbotService;
    private readonly pushNotificationService;
    constructor(pusher: PusherService, chatbotService: ChatbotService, pushNotificationService: PushNotificationService);
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
    askAI(message: string, chatId: string): Promise<void>;
    savePushToken(employee_id: string, token: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
