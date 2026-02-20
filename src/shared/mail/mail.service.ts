import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  context: Record<string, unknown>;
}

export enum EmailTemplate {
  ENROLLMENT_ACTIVATED = 'enrollment_activated',
  ASSIGNMENT_SUBMITTED = 'assignment_submitted',
  ASSIGNMENT_SUBMITTED_ADMIN = 'assignment_submitted_admin',
  COURSE_COMPLETED = 'course_completed',
  CERTIFICATE_GENERATED = 'certificate_generated',
  WEBINAR_PUBLISHED = 'webinar_published',
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly isSmtpConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.isSmtpConfigured = !!(host && port && user && pass);

    if (this.isSmtpConfigured) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('✅ SMTP transporter initialized');
    } else {
      this.logger.warn(
        '⚠️  SMTP not configured – emails will be simulated (logged only)',
      );
    }
  }

  // ─── SEND ───────────────────────────────────────────────────────────────

  async send(options: SendMailOptions): Promise<void> {
    const html = this.buildHtml(options.template, options.context);

    if (!this.isSmtpConfigured || !this.transporter) {
      this.simulateSend(options, html);
      return;
    }

    try {
      const from =
        this.config.get<string>('SMTP_FROM') ??
        `"Innodemmy LMS" <no-reply@innodemmy.com>`;

      await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(
        `📧 Email sent → [${options.subject}] to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
      );
    } catch (err) {
      this.logger.error(`❌ Failed to send email: ${(err as Error).message}`);
    }
  }

  // ─── SIMULATE ────────────────────────────────────────────────────────────

  private simulateSend(options: SendMailOptions, html: string): void {
    this.logger.debug('─────────── [EMAIL SIMULATED] ───────────');
    this.logger.debug(
      `To      : ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
    );
    this.logger.debug(`Subject : ${options.subject}`);
    this.logger.debug(`Template: ${options.template}`);
    this.logger.debug(`Context : ${JSON.stringify(options.context, null, 2)}`);
    this.logger.debug('────────── [BEGIN HTML PREVIEW] ─────────');
    this.logger.debug(
      html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    this.logger.debug('─────────────────────────────────────────');
  }

  // ─── HTML BUILDER ────────────────────────────────────────────────────────

  private buildHtml(
    template: EmailTemplate,
    ctx: Record<string, unknown>,
  ): string {
    switch (template) {
      case EmailTemplate.ENROLLMENT_ACTIVATED:
        return this.tpl(
          '🎉 Enrollment Activated',
          `<p>Hi <strong>${String(ctx.name)}</strong>,</p>
           <p>Your enrollment in <strong>${String(ctx.courseName)}</strong> has been <span style="color:#16a34a">activated</span>.</p>
           <p>You can now access all course materials. Happy learning!</p>`,
        );

      case EmailTemplate.ASSIGNMENT_SUBMITTED:
        return this.tpl(
          '✅ Assignment Submitted Successfully',
          `<p>Hi <strong>${String(ctx.name)}</strong>,</p>
           <p>Your assignment <strong>${String(ctx.assignmentTitle)}</strong> for course <strong>${String(ctx.courseName)}</strong> has been received.</p>
           <p>Our instructors will review it shortly.</p>`,
        );

      case EmailTemplate.ASSIGNMENT_SUBMITTED_ADMIN:
        return this.tpl(
          '📋 New Assignment Submission',
          `<p>Hi <strong>${String(ctx.adminName)}</strong>,</p>
           <p>Student <strong>${String(ctx.studentName)}</strong> (<em>${String(ctx.studentEmail)}</em>) has submitted assignment <strong>${String(ctx.assignmentTitle)}</strong>.</p>
           <p>Please log in to review the submission.</p>`,
        );

      case EmailTemplate.COURSE_COMPLETED:
        return this.tpl(
          '🏆 Course Completed!',
          `<p>Hi <strong>${String(ctx.name)}</strong>,</p>
           <p>Congratulations! You have successfully completed <strong>${String(ctx.courseName)}</strong>.</p>
           <p>Your certificate will be generated shortly.</p>`,
        );

      case EmailTemplate.CERTIFICATE_GENERATED:
        return this.tpl(
          '🎓 Your Certificate is Ready',
          `<p>Hi <strong>${String(ctx.name)}</strong>,</p>
           <p>Your certificate for <strong>${String(ctx.courseName)}</strong> has been generated.</p>
           ${String(ctx.certificateUrl) !== 'undefined' ? `<p><a href="${String(ctx.certificateUrl)}" style="color:#2563eb">Download Certificate</a></p>` : ''}`,
        );

      case EmailTemplate.WEBINAR_PUBLISHED:
        return this.tpl(
          '📢 New Webinar Published',
          `<p>Hi <strong>${String(ctx.name)}</strong>,</p>
           <p>A new webinar <strong>${String(ctx.webinarTitle)}</strong> has been published!</p>
           <p>Date: <strong>${String(ctx.webinarDate)}</strong></p>
           <p>Don't miss out – register your spot today.</p>`,
        );

      default:
        return this.tpl('Notification', `<p>${JSON.stringify(ctx)}</p>`);
    }
  }

  // ─── BASE TEMPLATE ────────────────────────────────────────────────────────

  private tpl(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;">Innodemmy LMS</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #e5e7eb;">
              &copy; ${new Date().getFullYear()} Innodemmy. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
