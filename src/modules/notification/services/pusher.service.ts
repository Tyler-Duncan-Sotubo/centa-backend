import { Injectable, Inject } from '@nestjs/common';
import * as Pusher from 'pusher';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { eq, desc, and } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { notification } from '../schema/notification.schema';

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
    const urlMap: Record<string, string> = {
      leave: `${baseUrl}/leave`,
      loan: `${baseUrl}/loans`, // salary advance
      expense: `${baseUrl}/expenses`, // expenses
      asset: `${baseUrl}/assets/requests`,
    };

    const url = urlMap[type] ?? `${baseUrl}/notifications`;

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

  // PusherService.ts
  async createEmployeeNotification(
    companyId: string,
    employeeId: string,
    message: string,
    type: string,
  ) {
    /* 1.  Build the URL the bell-icon should deep-link to */
    const baseUrl = this.config.get('EMPLOYEE_DASHBOARD_URL') || '/dashboard';
    const urlMap: Record<string, string> = {
      leave: `${baseUrl}/leave`,
      loan: `${baseUrl}/loans`, // salary advance
      expense: `${baseUrl}/reimbursements`, // expenses
      asset: `${baseUrl}/assets`,
    };

    const url = urlMap[type] ?? `${baseUrl}/notifications`;

    /* 2.  Persist */
    const [saved] = await this.db
      .insert(notification)
      .values({
        company_id: companyId,
        employee_id: employeeId, // 👈  target user
        message,
        type,
        url,
      })
      .returning({
        id: notification.id,
        message: notification.message,
        url: notification.url,
      })
      .execute();

    /* 3.  Broadcast only to that employee */
    await this.pusher.trigger(
      `employee-${employeeId}`, // 👈  dedicated channel
      'new-notification',
      saved,
    );

    return saved;
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

  // Fetch notifications for employees

  // Fetch all notifications for a user
  async getEmployeeNotifications(company_id: string, employeeId: string) {
    return this.db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.company_id, company_id),
          eq(notification.employee_id, employeeId),
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
