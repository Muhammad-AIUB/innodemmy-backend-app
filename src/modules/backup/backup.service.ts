import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Maximum number of backup files to retain on disk.
   */
  private readonly MAX_BACKUPS = 7;

  /**
   * Directory where backups are stored.
   * Override with BACKUP_DIR env variable (e.g. /var/backups/postgres on your VPS).
   */
  private readonly backupDir: string;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR') ?? '/backups';
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  onModuleInit(): void {
    this.ensureBackupDir();
    this.scheduleDailyBackup();
  }

  onModuleDestroy(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.logger.log('Backup cron job stopped.');
    }
  }

  // ─── Scheduling ───────────────────────────────────────────────────────────

  /**
   * Schedules a daily backup at 12:00 AM UTC using node-cron.
   * Cron expression: '0 0 * * *'
   */
  private scheduleDailyBackup(): void {
    this.cronJob = cron.schedule(
      '0 0 * * *',
      async () => {
        await this.runBackup();
      },
      { timezone: 'UTC' },
    );

    this.logger.log(
      'Daily backup cron job scheduled — runs at 00:00 UTC every day.',
    );
  }

  // ─── Core backup logic ────────────────────────────────────────────────────

  /**
   * Runs pg_dump against the configured database and saves the output to
   * the backup directory.  Returns the absolute path of the created file.
   *
   * This method is also used by the admin controller for manual triggers.
   */
  async runBackup(): Promise<string> {
    this.logger.log('Backup started.');

    const { command, outFile, env } = this.buildDumpCommand();

    try {
      await execAsync(command, { env });
      this.logger.log(`Backup completed successfully → ${outFile}`);

      await this.pruneOldBackups();

      return outFile;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Backup failed: ${message}`);
      throw new Error(`Database backup failed: ${message}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Builds the pg_dump shell command and injects credentials via environment
   * variables so passwords never appear in process listings.
   */
  private buildDumpCommand(): {
    command: string;
    outFile: string;
    env: NodeJS.ProcessEnv;
  } {
    const databaseUrl =
      this.configService.get<string>('DATABASE_URL_UNPOOLED') ??
      this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL_UNPOOLED (or DATABASE_URL) is not defined in environment variables.',
      );
    }

    const parsed = this.parseDatabaseUrl(databaseUrl);
    const today = this.todayDateString();
    const fileName = `backup-${today}.sql`;
    const outFile = path.join(this.backupDir, fileName);

    // Build pg_dump arguments
    const args: string[] = [
      `--host=${parsed.host}`,
      `--port=${parsed.port}`,
      `--username=${parsed.user}`,
      `--dbname=${parsed.database}`,
      '--format=plain',
      '--no-password', // password is supplied via PGPASSWORD env var
      `--file=${outFile}`,
    ];

    const command = `pg_dump ${args.join(' ')}`;

    // Credentials injected through environment — never visible in ps/top
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PGPASSWORD: parsed.password,
      ...(parsed.sslmode ? { PGSSLMODE: parsed.sslmode } : {}),
    };

    return { command, outFile, env };
  }

  /**
   * Parses a PostgreSQL connection URL into its constituent parts.
   *
   * Supports both `postgresql://` and `postgres://` schemes.
   */
  private parseDatabaseUrl(url: string): {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    sslmode: string | undefined;
  } {
    const parsed = new URL(url);

    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      sslmode: parsed.searchParams.get('sslmode') ?? undefined,
    };
  }

  /**
   * Deletes the oldest backup files when the total count exceeds MAX_BACKUPS.
   * Files are sorted by name (ISO date format guarantees chronological order).
   */
  private async pruneOldBackups(): Promise<void> {
    const files = fs
      .readdirSync(this.backupDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
      .sort(); // ascending — oldest first

    if (files.length <= this.MAX_BACKUPS) {
      return;
    }

    const toDelete = files.slice(0, files.length - this.MAX_BACKUPS);

    for (const file of toDelete) {
      const filePath = path.join(this.backupDir, file);
      fs.unlinkSync(filePath);
      this.logger.log(`Old backup removed: ${filePath}`);
    }
  }

  /**
   * Creates the backup directory if it does not already exist.
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Backup directory created: ${this.backupDir}`);
    }
  }

  /**
   * Returns today's date formatted as YYYY-MM-DD in UTC.
   */
  private todayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
