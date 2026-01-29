import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

type SendGridError = any;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getStatusCode(err: SendGridError): number | undefined {
  return err?.code ?? err?.response?.statusCode;
}

function isRetryable(err: SendGridError): boolean {
  const status = getStatusCode(err);
  if (!status) {
    // likely network/timeout/etc.
    return true;
  }
  return status === 429 || (status >= 500 && status <= 599);
}

function backoffMs(attempt: number, base = 250, cap = 5000) {
  // attempt starts at 1
  const exp = Math.min(cap, base * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 200); // 0-199ms
  return exp + jitter;
}

@Injectable()
export class EmailVerificationService implements OnModuleInit {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const key = this.config.get<string>('SEND_GRID_KEY');
    if (!key) {
      this.logger.error('SEND_GRID_KEY is missing');
      return;
    }
    sgMail.setApiKey(key);
  }

  private async sendWithRetry(msg: sgMail.MailDataRequired, maxAttempts = 4) {
    let lastErr: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Optional: add a timeout around send
        await Promise.race([
          sgMail.send(msg),
          (async () => {
            await sleep(10_000);
            throw new Error('SendGrid send timeout after 10s');
          })(),
        ]);
        return; // success
      } catch (err) {
        lastErr = err;

        const status = getStatusCode(err);
        const body = err?.response?.body;

        // log once per attempt
        this.logger.warn(
          `SendGrid send failed (attempt ${attempt}/${maxAttempts}) status=${status ?? 'n/a'}`,
        );
        if (body) this.logger.debug(body);

        if (!isRetryable(err) || attempt === maxAttempts) break;

        await sleep(backoffMs(attempt));
      }
    }

    throw lastErr;
  }

  async sendVerifyEmail(email: string, token: string, companyName?: string) {
    const msg: sgMail.MailDataRequired = {
      to: email,
      from: { name: 'noreply@centahr.com', email: 'noreply@centahr.com' },
      templateId: this.config.get<string>('VERIFY_TEMPLATE_ID')!,
      dynamicTemplateData: {
        verificationCode: token,
        email,
        companyName,
      },
    };

    await this.sendWithRetry(msg);
  }

  async sendVerifyLogin(email: string, token: string) {
    const msg: sgMail.MailDataRequired = {
      to: email,
      from: { name: 'noreply@centahr.com', email: 'noreply@centahr.com' },
      templateId: this.config.get<string>('VERIFY_LOGIN_TEMPLATE_ID')!,
      dynamicTemplateData: {
        verificationCode: token,
        email,
      },
    };

    await this.sendWithRetry(msg);
  }
}
