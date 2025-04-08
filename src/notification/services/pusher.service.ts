import { Injectable, Inject } from '@nestjs/common';
import * as Pusher from 'pusher';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { notification } from 'src/drizzle/schema/notifcation.schema';
import { eq, desc, and } from 'drizzle-orm';

@Injectable()
export class PusherService {
  private pusher: Pusher;

  constructor(
    private config: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {
    this.pusher = new Pusher({
      appId: this.config.get<string>('PUSHER_APP_ID') || '',
      key: this.config.get<string>('PUSHER_KEY') || '',
      secret: this.config.get<string>('PUSHER_SECRET') || '',
      cluster: this.config.get<string>('PUSHER_CLUSTER') || '',
      useTLS: true, // Ensures a secure connection
    });
  }

  async triggerEvent(channel: string, event: string, data: any) {
    await this.pusher.trigger(channel, event, data);
  }

  // Create & broadcast a new notification
  async createNotification(company_id: string, message: string, type: string) {
    // Get base dashboard URL from config
    const baseUrl = this.config.get('CLIENT_DASHBOARD_URL') || '/dashboard';

    // Define URL based on notification type
    let url = `${baseUrl}/notifications`; // Default URL

    switch (type) {
      case 'loan':
        url = `${baseUrl}/salary-advance`;
        break;
      case 'payroll':
        url = `${baseUrl}/payroll`;
        break;
      case 'expense':
        url = `${baseUrl}/expenses`;
        break;
      // Add more cases if needed
    }

    const result = await this.db
      .insert(notification)
      .values({
        message,
        type,
        company_id,
        url, // Store the full URL in the database
      })
      .returning({
        id: notification.id,
        message: notification.message,
        url: notification.url,
      })
      .execute();

    // Broadcast via Pusher
    this.pusher.trigger(`company-${company_id}`, 'new-notification', result[0]);

    return result;
  }

  // Fetch all notifications for a user
  async getUserNotifications(company_id: string) {
    return this.db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.company_id, company_id),
          eq(notification.read, 'false'),
        ),
      )
      .limit(5)
      .orderBy(desc(notification.created_at));
  }

  // Mark a notification as read
  async markAsRead(notificationId: string) {
    return this.db
      .update(notification)
      .set({ read: 'true' })
      .where(eq(notification.id, notificationId));
  }
}
