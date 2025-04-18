import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { employees } from 'src/drizzle/schema/employee.schema';
import { eq } from 'drizzle-orm';
import { expo_tokens } from 'src/drizzle/schema/expo.schema';

@Injectable()
export class PushNotificationService {
  private expo: Expo;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(@Inject(DRIZZLE) private db: db) {
    this.expo = new Expo();
  }

  async sendPushNotification(
    employee_id: string,
    title: string,
    body: string,
    data: any = {},
  ): Promise<void> {
    // get the token from the database
    const token = await this.db
      .select()
      .from(expo_tokens)
      .where(eq(expo_tokens.employee_id, employee_id))
      .execute();

    if (token.length === 0) {
      return;
    }

    const expoPushToken = token[0].expoPushToken;

    if (!Expo.isExpoPushToken(expoPushToken)) {
      this.logger.warn(`Invalid Expo push token: ${expoPushToken}`);
      return;
    }

    const messages: ExpoPushMessage[] = [
      {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      },
    ];

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        this.logger.log(
          `✅ Push notification sent: ${JSON.stringify(ticketChunk)}`,
        );
      } catch (error) {
        this.logger.log('❌ Error sending push notification', error);
      }
    }
  }

  async saveToken(employee_id: string, token: string) {
    const employee = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    if (employee.length === 0) {
      throw new BadRequestException('Employee not found');
    }

    // Check if the token is valid
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('Invalid Expo push token');
    }

    // Save the token to the database
    const existingToken = await this.db
      .select()
      .from(expo_tokens)
      .where(eq(expo_tokens.employee_id, employee_id));

    if (existingToken.length > 0) {
      await this.db
        .update(expo_tokens)
        .set({ expoPushToken: token })
        .where(eq(expo_tokens.employee_id, employee_id))
        .execute();
    } else {
      await this.db
        .insert(expo_tokens)
        .values({
          employee_id,
          expoPushToken: token,
        })
        .execute();
    }

    return { success: true, message: 'Token saved successfully' };
  }
}
