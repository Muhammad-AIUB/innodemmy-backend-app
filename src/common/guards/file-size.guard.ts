import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';

const MAX_SLIP_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Guard that validates payment slip file size via HTTP HEAD request.
 * Applied to the upload-slip route to enforce the 2MB limit server-side.
 */
@Injectable()
export class FileSizeGuard implements CanActivate {
  private readonly logger = new Logger(FileSizeGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ body?: { slipUrl?: string } }>();
    const slipUrl: string | undefined = request.body?.slipUrl;

    if (!slipUrl) {
      return true; // Let DTO validation handle missing field
    }

    try {
      const response = await fetch(slipUrl, { method: 'HEAD' });

      if (!response.ok) {
        throw new BadRequestException(
          'Unable to verify the uploaded file. Please check the URL.',
        );
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_SLIP_SIZE_BYTES) {
        throw new BadRequestException(
          'File size exceeds the 2MB limit. Please upload a smaller file.',
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (contentType && !allowedTypes.some((t) => contentType.includes(t))) {
        throw new BadRequestException(
          'Invalid file type. Only jpg, jpeg, png, and pdf are allowed.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(
        `File size check failed for ${slipUrl}: ${(err as Error).message}`,
      );
      // If HEAD request fails (e.g., CDN doesn't support HEAD), allow through
      // The URL extension validation in DTO is the primary defense
    }

    return true;
  }
}
