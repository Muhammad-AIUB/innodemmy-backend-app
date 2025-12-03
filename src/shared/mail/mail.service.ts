import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  // OTP ইমেইল পাঠানো (Queue-তে দিয়ে দিব)
  async sendOtp(email: string, otp: string) {
    const html = `
      <div style="font-family: Arial; text-align: center; padding: 30px; background: #f4f4f4;">
        <h2>Verify Your Email</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px; font-size: 32px;">${otp}</h1>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
      </div>
    `;

    await this.emailQueue.add('send-otp', {
      to: email,
      subject: 'Your Verification Code',
      html,
    });
  }

  // অন্য ইমেইলও একইভাবে পাঠাবি
}
