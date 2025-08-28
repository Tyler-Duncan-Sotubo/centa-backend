// notifications/push-notification.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import type { db } from 'src/drizzle/types/drizzle';
import { employees } from 'src/drizzle/schema';

// Adjust these imports to your actual schema file paths/names.
import {
  expo_notificationDeliveries,
  expo_notifications,
  expoPushDevices,
} from '../schema/expo.schema';
import { SendToEmployeeDto } from '../dto/send-to-employee.dto';

@Injectable()
export class PushNotificationService {
  private expo: Expo;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(@Inject(DRIZZLE) private db: db) {
    // If you have an Expo access token, pass it for higher throughput
    // this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    this.expo = new Expo();
  }

  // ------------------------------------------------------------
  // Device registration
  // ------------------------------------------------------------

  /** Register or update a token for an employee */

  async saveToken(
    employeeId: string,
    token: string,
    companyId: string,
    meta?: { platform?: string; deviceId?: string; appVersion?: string },
  ) {
    // Validate employee exists
    const emp = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .execute();

    if (!emp.length) throw new BadRequestException('Employee not found');

    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('Invalid Expo push token');
    }

    // Check if token already exists
    const existing = await this.db
      .select()
      .from(expoPushDevices)
      .where(eq(expoPushDevices.expoPushToken, token))
      .execute();

    if (existing.length) {
      // Update existing token record
      await this.db
        .update(expoPushDevices)
        .set({
          employeeId,
          companyId,
          platform: (meta?.platform as any) ?? 'unknown',
          deviceId: meta?.deviceId ?? null,
          appVersion: meta?.appVersion ?? null,
          updatedAt: new Date(),
        })
        .where(eq(expoPushDevices.expoPushToken, token))
        .execute();
    } else {
      // Insert new device row
      await this.db
        .insert(expoPushDevices)
        .values({
          employeeId,
          companyId,
          expoPushToken: token,
          platform: (meta?.platform as any) ?? 'unknown',
          deviceId: meta?.deviceId ?? null,
          appVersion: meta?.appVersion ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
    }

    return { success: true, message: 'Token saved successfully' };
  }

  /** Optional: revoke on logout */
  async deleteToken(token: string) {
    await this.db
      .delete(expoPushDevices)
      .where(eq(expoPushDevices.expoPushToken, token))
      .execute();
    return { success: true };
  }

  // ------------------------------------------------------------
  // Durable inbox helpers
  // ------------------------------------------------------------

  /** Count unread notifications for an employee (used for iOS badge) */
  private async getEmployeeUnreadCount(employeeId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(expo_notifications)
      .where(
        and(
          eq(expo_notifications.employeeId, employeeId),
          isNull(expo_notifications.readAt),
          eq(expo_notifications.isArchived, false),
        ),
      )
      .execute();

    return row?.count ?? 0;
  }

  /** Create a durable notification and send push to all devices for the employee */
  async createAndSendToEmployee(employeeId: string, dto: SendToEmployeeDto) {
    const { title, body, type, route, data = {}, url } = dto;

    // 1) Create DB row
    const [created] = await this.db
      .insert(expo_notifications)
      .values({
        employeeId,
        title,
        body: body ?? null,
        type,
        route: route ?? null,
        data,
        url: url ?? null,
        // readAt: null by default
      })
      .returning({ id: expo_notifications.id })
      .execute();

    const notifId = created.id;

    // 2) Compute unread count for badge (includes this newly created row)
    const unread = await this.getEmployeeUnreadCount(employeeId);

    // 3) Gather tokens
    const rows = await this.db
      .select({
        id: expoPushDevices.id,
        token: expoPushDevices.expoPushToken,
        platform: expoPushDevices.platform,
      })
      .from(expoPushDevices)
      .where(eq(expoPushDevices.employeeId, employeeId))
      .execute();

    const tokens = Array.from(
      new Set(rows.map((r) => r.token).filter((t) => Expo.isExpoPushToken(t))),
    );

    // 4) Send push (include the durable notification id + route in data)
    if (tokens.length) {
      await this.sendToTokens(
        tokens,
        {
          title,
          body: body ?? '',
          data: {
            route,
            params: data ?? {},
            notificationId: notifId,
            ...data,
            id: data?.id,
          },
          badge: unread, // iOS badge count for THIS employee
        },
        { notificationId: notifId, deviceRows: rows }, // optional auditing
      );
    }

    return { id: notifId };
  }

  async createAndSendToCompany(
    companyId: string,
    dto: SendToEmployeeDto,
    opts?: { employeeIds?: string[] }, // optional: target a subset
  ) {
    const { title, body, type, route, data = {}, url } = dto;

    // 0) Decide recipients
    let targetEmployeeIds: string[];
    if (opts?.employeeIds?.length) {
      targetEmployeeIds = Array.from(new Set(opts.employeeIds));
    } else {
      // default: employees in this company who have at least one registered device
      const deviceEmployees = await this.db
        .select({ employeeId: expoPushDevices.employeeId })
        .from(expoPushDevices)
        .where(eq(expoPushDevices.companyId, companyId))
        .execute();
      targetEmployeeIds = Array.from(
        new Set(deviceEmployees.map((r) => r.employeeId)),
      );
    }

    if (targetEmployeeIds.length === 0) {
      return { created: 0, sentTo: 0, recipients: [] };
    }

    // 1) Create one DB row per employee (bulk insert)
    const rowsToInsert = targetEmployeeIds.map((employeeId) => ({
      employeeId,
      title,
      body: body ?? null,
      type,
      route: route ?? null,
      data,
      url: url ?? null,
      // readAt defaults to null
    }));

    const created = await this.db
      .insert(expo_notifications)
      .values(rowsToInsert)
      .returning({
        id: expo_notifications.id,
        employeeId: expo_notifications.employeeId,
      })
      .execute();

    const notifIdByEmployee = new Map<string, string>();
    for (const row of created) notifIdByEmployee.set(row.employeeId, row.id);

    // 2) Compute unread counts per employee (after insert)
    const unreadRows = await this.db
      .select({
        employeeId: expo_notifications.employeeId,
        count: sql<number>`count(*)`,
      })
      .from(expo_notifications)
      .where(
        and(
          inArray(expo_notifications.employeeId, targetEmployeeIds),
          isNull(expo_notifications.readAt),
        ),
      )
      .groupBy(expo_notifications.employeeId)
      .execute();

    const unreadByEmployee = new Map<string, number>();
    for (const u of unreadRows)
      unreadByEmployee.set(u.employeeId, Number(u.count));

    // 3) Gather devices (by company + recipients)
    const deviceRows = await this.db
      .select({
        id: expoPushDevices.id,
        token: expoPushDevices.expoPushToken,
        platform: expoPushDevices.platform,
        employeeId: expoPushDevices.employeeId,
      })
      .from(expoPushDevices)
      .where(
        and(
          eq(expoPushDevices.companyId, companyId),
          inArray(expoPushDevices.employeeId, targetEmployeeIds),
        ),
      )
      .execute();

    // group tokens per employee, validate & dedupe
    const tokensByEmployee = new Map<string, string[]>();
    for (const { employeeId, token } of deviceRows) {
      if (!Expo.isExpoPushToken(token)) continue;
      const arr = tokensByEmployee.get(employeeId) ?? [];
      if (!arr.includes(token)) arr.push(token);
      tokensByEmployee.set(employeeId, arr);
    }

    // 4) Send per-employee so badge/id are correct
    let totalDevices = 0;
    for (const employeeId of targetEmployeeIds) {
      const tokens = tokensByEmployee.get(employeeId) ?? [];
      if (!tokens.length) continue;

      totalDevices += tokens.length;

      const notifId = notifIdByEmployee.get(employeeId)!;
      const badge = unreadByEmployee.get(employeeId) ?? 0;

      // if your existing helper only supports one payload for many tokens, call it per employee:
      await this.sendToTokens(
        tokens,
        {
          title,
          body: body ?? '',
          data: {
            route,
            params: data ?? {},
            notificationId: notifId,
            ...data,
            id: data?.id,
          },
          badge,
        },
        {
          notificationId: notifId,
          deviceRows: deviceRows.filter((d) => d.employeeId === employeeId),
        },
      );
    }

    return {
      created: created.length,
      sentTo: totalDevices,
      recipients: targetEmployeeIds,
    };
  }

  /** List notifications for an employee */
  async getNotificationsForEmployee(employeeId: string) {
    const status = 'unread';
    const whereClause =
      status === 'unread'
        ? and(
            eq(expo_notifications.employeeId, employeeId),
            isNull(expo_notifications.readAt),
            eq(expo_notifications.isArchived, false),
          )
        : eq(expo_notifications.employeeId, employeeId);

    const rows = await this.db
      .select()
      .from(expo_notifications)
      .where(whereClause)
      .orderBy(desc(expo_notifications.createdAt))
      .limit(10)
      .execute();

    return rows;
  }

  /** Get unread count for an employee */
  async getUnreadCount(employeeId: string) {
    const count = await this.getEmployeeUnreadCount(employeeId);
    return { count };
  }

  /** Mark a single notification as read */
  async markRead(notificationId: string) {
    await this.db
      .update(expo_notifications)
      .set({ readAt: new Date() })
      .where(eq(expo_notifications.id, notificationId))
      .execute();

    return { success: true };
  }

  /** Mark all unread as read */
  async markAllRead(employeeId: string) {
    await this.db
      .update(expo_notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(expo_notifications.employeeId, employeeId),
          isNull(expo_notifications.readAt),
        ),
      )
      .execute();

    const count = await this.getEmployeeUnreadCount(employeeId);
    return { success: true, unreadCount: count };
  }

  /** Optional: archive a notification (hide from inbox, keep history) */
  async archive(notificationId: string, employeeId: string) {
    await this.db
      .update(expo_notifications)
      .set({ isArchived: true })
      .where(
        and(
          eq(expo_notifications.id, notificationId),
          eq(expo_notifications.employeeId, employeeId),
        ),
      )
      .execute();
    return { success: true };
  }

  // ------------------------------------------------------------
  // Sending helpers (push-only, with optional auditing)
  // ------------------------------------------------------------

  /** Single-employee convenience (push-only, no DB row) */
  async sendPushNotification(
    employee_id: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    const rows = await this.db
      .select()
      .from(expoPushDevices)
      .where(eq(expoPushDevices.employeeId, employee_id))
      .execute();

    if (!rows.length) return;

    const tokens = Array.from(
      new Set(
        rows.map((r) => r.expoPushToken).filter((t) => Expo.isExpoPushToken(t)),
      ),
    );

    if (!tokens.length) return;

    await this.sendToTokens(tokens, { title, body, data });
  }

  /** Send to many employees (push-only, no DB rows) */
  async sendToEmployees(
    employeeIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!employeeIds.length) return;

    const rows = await this.db
      .select({ token: expoPushDevices.expoPushToken })
      .from(expoPushDevices)
      .where(inArray(expoPushDevices.employeeId, employeeIds))
      .execute();

    const tokens = Array.from(
      new Set(rows.map((r) => r.token).filter((t) => Expo.isExpoPushToken(t))),
    );

    if (tokens.length) {
      await this.sendToTokens(tokens, { title, body, data });
    }
  }

  /**
   * Broadcast helper (supports iOS badge + optional delivery auditing).
   * Set `payload.badge` from your server's unread count when relevant.
   */
  async sendToTokens(
    tokens: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, any>;
      badge?: number;
    },
    audit?: {
      notificationId?: string;
      deviceRows?: { id: string; token: string }[];
    },
  ) {
    if (!tokens.length) return;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      badge: payload.badge, // iOS only (ignored on Android)
    }));

    const chunks = this.expo.chunkPushNotifications(messages);

    // Optional: map ticket -> token for later pruning/auditing
    const ticketToToken = new Map<string, string>();

    const allTickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        allTickets.push(...ticketChunk);

        // Map tickets to tokens if present (parallel array order is preserved)
        ticketChunk.forEach((ticket, idx) => {
          const token = chunk[idx]?.to as string | undefined;
          if (ticket.status === 'ok' && ticket.id && token) {
            ticketToToken.set(ticket.id, token);
          }
        });
      } catch (error) {
        this.logger.error('Error sending push notifications', error as any);
      }
    }

    // Optional: persist deliveries (remove if you don't maintain deliveries)
    if (audit?.notificationId && audit?.deviceRows?.length) {
      const items = Array.from(ticketToToken.entries())
        .map(([ticketId, token]) => {
          const device = audit.deviceRows!.find((d) => d.token === token);
          return device
            ? {
                notificationId: audit.notificationId!,
                pushDeviceId: device.id,
                expoTicketId: ticketId,
                sentAt: new Date(),
              }
            : undefined;
        })
        .filter(Boolean) as Array<{
        notificationId: string;
        pushDeviceId: string;
        expoTicketId: string;
        sentAt: Date;
      }>;

      if (items.length) {
        try {
          await this.db
            .insert(expo_notificationDeliveries)
            .values(items)
            .execute();
        } catch (e) {
          this.logger.warn(
            'Failed to persist notification deliveries',
            e as any,
          );
        }
      }
    }

    // Receipts (and pruning)
    const ticketIds = allTickets
      .map((t) => (t.status === 'ok' ? t.id : null))
      .filter(Boolean) as string[];

    if (ticketIds.length) {
      await this.checkReceiptsAndPrune(ticketIds, ticketToToken);
    }
  }

  /** Check receipts and prune invalid tokens (with optional ticket->token map) */
  private async checkReceiptsAndPrune(
    ticketIds: string[],
    ticketToToken?: Map<string, string>,
  ) {
    const receiptChunks = this.expo.chunkPushNotificationReceiptIds(ticketIds);

    for (const chunk of receiptChunks) {
      try {
        const receipts =
          await this.expo.getPushNotificationReceiptsAsync(chunk);

        for (const [id, receipt] of Object.entries(receipts)) {
          if ((receipt as any).status === 'ok') continue;

          this.logger.warn(
            `Expo receipt error for ticket ${id}: ${(receipt as any).message}`,
          );
          const code = (receipt as any)?.details?.error as string | undefined;

          if (code === 'DeviceNotRegistered') {
            const token = ticketToToken?.get(id);
            if (token) {
              // prune this specific token
              await this.db
                .delete(expoPushDevices)
                .where(eq(expoPushDevices.expoPushToken, token))
                .execute();
              this.logger.warn(`Pruned unregistered token: ${token}`);
            } else {
              // fallback: cannot know which token; consider logging
              this.logger.warn(
                'DeviceNotRegistered but token unknown (no audit mapping)',
              );
            }
          }
        }
      } catch (error) {
        this.logger.error('Error fetching receipts', error as any);
      }
    }
  }
}
