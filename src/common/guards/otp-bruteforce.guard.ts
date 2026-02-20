import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Guards OTP verification endpoint against brute-force attacks.
 * Tracks failed attempts per email in memory.
 * After 3 failed attempts within 10 minutes, blocks the email for 10 minutes.
 */
@Injectable()
export class OtpBruteforceGuard implements CanActivate {
  private readonly logger = new Logger(OtpBruteforceGuard.name);
  private readonly attempts = new Map<string, AttemptRecord>();

  constructor() {
    // Cleanup stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ body?: { email?: string } }>();
    const email: string | undefined = request.body?.email;

    if (!email) {
      return true; // Let DTO validation handle missing email
    }

    const key = email.toLowerCase().trim();
    const now = Date.now();

    const record = this.attempts.get(key);

    // Check if currently blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
      const remainingSec = Math.ceil((record.blockedUntil - now) / 1000);
      this.logger.warn(`[OTP_BLOCKED] email=${key} remaining=${remainingSec}s`);
      throw new HttpException(
        {
          success: false,
          message: `Too many failed OTP attempts. Please try again in ${remainingSec} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // If block has expired, reset
    if (record?.blockedUntil && now >= record.blockedUntil) {
      this.attempts.delete(key);
    }

    return true;
  }

  /**
   * Called by the auth service after a FAILED OTP verification attempt.
   */
  recordFailedAttempt(email: string): void {
    const key = email.toLowerCase().trim();
    const now = Date.now();

    const record = this.attempts.get(key);

    if (!record || now - record.firstAttempt > WINDOW_MS) {
      // Start new window
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        blockedUntil: null,
      });
      return;
    }

    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
      this.logger.warn(
        `[OTP_BRUTEFORCE] email=${key} blocked for ${BLOCK_DURATION_MS / 1000}s after ${record.count} attempts`,
      );
    }
  }

  /**
   * Called by the auth service after a SUCCESSFUL OTP verification.
   */
  clearAttempts(email: string): void {
    this.attempts.delete(email.toLowerCase().trim());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      const expired =
        (record.blockedUntil && now >= record.blockedUntil) ||
        (!record.blockedUntil && now - record.firstAttempt > WINDOW_MS);

      if (expired) {
        this.attempts.delete(key);
      }
    }
  }
}
