import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'public', 'uploads');

  constructor() {
    void this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(join(this.uploadDir, 'images'), { recursive: true });
      await fs.mkdir(join(this.uploadDir, 'videos'), { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directories:', error);
    }
  }

  /**
   * Save uploaded file to disk and return the file URL
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    type: 'images' | 'videos',
  ): Promise<string> {
    const ext = originalName.split('.').pop();
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(this.uploadDir, type, filename);

    await fs.writeFile(filepath, buffer);

    return `/uploads/${type}/${filename}`;
  }

  /**
   * Delete file from disk
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const filepath = join(process.cwd(), 'public', fileUrl);
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  /**
   * Validate file type
   */
  validateImageType(mimetype: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return allowedTypes.includes(mimetype);
  }

  /**
   * Validate video type
   */
  validateVideoType(mimetype: string): boolean {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    return allowedTypes.includes(mimetype);
  }

  /**
   * Validate file size (in bytes)
   */
  validateFileSize(size: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }
}
