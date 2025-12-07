import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'send-otp') return;

    const { to, subject, html } = job.data;
    await this.mailerService.sendMail({
      to,
      from: process.env.MAIL_FROM,
      subject,
      html,
    });
  }
}
