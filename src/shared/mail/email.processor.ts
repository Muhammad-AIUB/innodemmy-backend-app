import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

@Processor('email', {
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job) {
    try {
      if (job.name !== 'send-otp') {
        this.logger.warn(`Unknown job name: ${job.name}`);
        return;
      }

      const { to, subject, html } = job.data;

      if (!to || !subject || !html) {
        throw new Error('Missing required email fields');
      }

      await this.mailerService.sendMail({
        to,
        from: process.env.MAIL_FROM || 'noreply@example.com',
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to} (Job ID: ${job.id})`);
    } catch (error) {
      this.logger.error(
        `Failed to send email (Job ID: ${job.id}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Let BullMQ handle retry
    }
  }
}
