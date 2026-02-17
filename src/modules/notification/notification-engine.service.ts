// src/modules/notification/services/notification-engine.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { eq } from 'drizzle-orm';
import { notificationEvents } from './schema/notification-events.schema';

type CreateNotificationEventInput = {
  companyId: string;
  channel?: 'email' | 'in_app';
  eventType: string;
  entityType?: 'goal' | 'assessment' | 'cycle' | 'announcement' | 'other';
  entityId?: string | null;
  recipientUserId?: string | null;
  recipientEmployeeId?: string | null;
  recipientEmail?: string | null;
  dedupeKey: string;
  payload?: any;
  jobName: 'sendNotificationEvent';
};

@Injectable()
export class NotificationEngineService {
  private readonly logger = new Logger(NotificationEngineService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    @InjectQueue('emailQueue') private readonly emailQueue: Queue,
  ) {}

  async createAndEnqueue(input: CreateNotificationEventInput) {
    const now = new Date();

    this.logger.log({
      op: 'notif.engine.createAndEnqueue.start',
      companyId: input.companyId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      recipientEmail: input.recipientEmail,
      dedupeKey: input.dedupeKey,
      jobName: input.jobName,
    });

    const payloadStr =
      input.payload === undefined ? null : JSON.stringify(input.payload);

    const inserted = await this.db
      .insert(notificationEvents)
      .values({
        companyId: input.companyId,
        channel: input.channel ?? 'email',
        eventType: input.eventType,
        entityType: (input.entityType ?? 'other') as any,
        entityId: input.entityId ?? null,
        recipientUserId: input.recipientUserId ?? null,
        recipientEmployeeId: input.recipientEmployeeId ?? null,
        recipientEmail: input.recipientEmail ?? null,
        dedupeKey: input.dedupeKey,
        status: 'queued',
        payload: payloadStr,
        queuedAt: now,
      } as any)
      .onConflictDoNothing({ target: notificationEvents.dedupeKey })
      .returning({
        id: notificationEvents.id,
        dedupeKey: notificationEvents.dedupeKey,
      });

    const row = inserted?.[0];

    if (!row) {
      this.logger.warn({
        op: 'notif.engine.deduped.skip',
        dedupeKey: input.dedupeKey,
      });
      return null;
    }

    this.logger.log({
      op: 'notif.engine.db.inserted',
      eventId: row.id,
      dedupeKey: row.dedupeKey,
    });

    await this.emailQueue.add(
      input.jobName, // must match worker switch
      { notificationEventId: row.id },
      {
        jobId: row.dedupeKey,
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log({
      op: 'notif.engine.enqueued',
      eventId: row.id,
      jobName: input.jobName,
      jobId: row.dedupeKey,
      data: { notificationEventId: row.id },
    });

    return row;
  }

  async markSent(eventId: string) {
    this.logger.log({ op: 'notif.engine.markSent', eventId });
    await this.db
      .update(notificationEvents)
      .set({ status: 'sent', sentAt: new Date() } as any)
      .where(eq(notificationEvents.id, eventId));
  }

  async markFailed(eventId: string, error: any) {
    this.logger.error({
      op: 'notif.engine.markFailed',
      eventId,
      errorMessage: String(error?.message ?? error ?? 'unknown'),
    });

    await this.db
      .update(notificationEvents)
      .set({
        status: 'failed',
        failedAt: new Date(),
        error: String(error?.message ?? error ?? 'unknown'),
      } as any)
      .where(eq(notificationEvents.id, eventId));
  }
}
