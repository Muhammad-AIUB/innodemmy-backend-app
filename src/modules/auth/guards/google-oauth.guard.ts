import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    // Attach Express-compatible response wrapper BEFORE calling parent canActivate
    // This ensures Passport can access res.setHeader when it needs to redirect
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    // Create and attach Express-compatible response wrapper
    if (reply != null) {
      const expressLikeResponse = this.createExpressLikeResponse(reply);

      // Attach to request in multiple ways that Passport might access it
      // Method 1: Direct property assignment
      (request as unknown as { res: typeof expressLikeResponse }).res =
        expressLikeResponse;

      // Method 2: Using Object.defineProperty for better compatibility
      Object.defineProperty(request, 'res', {
        value: expressLikeResponse,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      // Method 3: Also attach to raw request object
      (request as unknown as Record<string, unknown>).res = expressLikeResponse;

      // Method 4: Ensure it's available on the request prototype chain
      if (request.raw) {
        (request.raw as unknown as { res: typeof expressLikeResponse }).res =
          expressLikeResponse;
      }
    }

    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext): FastifyRequest {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    // Ensure Express-compatible response is attached
    if (reply != null && !(request as unknown as { res: unknown }).res) {
      const expressLikeResponse = this.createExpressLikeResponse(reply);
      (request as unknown as { res: typeof expressLikeResponse }).res =
        expressLikeResponse;
      (request as unknown as Record<string, unknown>).res = expressLikeResponse;
    }

    return request;
  }

  getResponse(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    // Ensure Express-compatible response is attached and return it
    if (reply != null) {
      if (!(request as unknown as { res: unknown }).res) {
        const expressLikeResponse = this.createExpressLikeResponse(reply);
        (request as unknown as { res: typeof expressLikeResponse }).res =
          expressLikeResponse;
        (request as unknown as Record<string, unknown>).res =
          expressLikeResponse;
      }
      // Return the wrapper so Passport can use Express-style methods
      return (request as unknown as { res: unknown }).res;
    }

    return reply;
  }

  private createExpressLikeResponse(reply: FastifyReply) {
    const expressLikeResponse = {
      setHeader: (name: string, value: string | number) => {
        reply.header(name, String(value));
      },
      redirect: (statusCode: number | string, url?: string) => {
        // Handle both Express-style redirect signatures:
        // redirect(url) or redirect(statusCode, url)
        // Fastify redirect signature: redirect(url: string, statusCode?: number)
        if (typeof statusCode === 'string') {
          // redirect(url) - statusCode is actually the URL
          const redirectUrl: string = statusCode;
          reply.redirect(redirectUrl, 302);
        } else if (url && typeof statusCode === 'number') {
          // redirect(statusCode, url) - Express style
          // Convert to Fastify: redirect(url, statusCode)
          const redirectUrl: string = url;
          const redirectStatusCode: number = statusCode;
          reply.redirect(redirectUrl, redirectStatusCode);
        }
        // Ensure response is sent (Fastify redirect already does this, but being explicit)
        return expressLikeResponse;
      },
      end: () => {
        reply.send();
      },
      status: (code: number) => {
        reply.code(code);
        return expressLikeResponse;
      },
      send: (body?: unknown) => {
        if (body) {
          reply.send(body);
        }
        return expressLikeResponse;
      },
      writeHead: (statusCode: number, headers?: Record<string, string>) => {
        reply.code(statusCode);
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            reply.header(key, value);
          });
        }
        return expressLikeResponse;
      },
      write: (chunk: unknown) => {
        if (chunk) {
          reply.send(chunk);
        }
        return true;
      },
      // Additional methods Passport might use
      getHeader: (name: string) => {
        return reply.getHeader(name);
      },
      removeHeader: (name: string) => {
        reply.removeHeader(name);
      },
      headersSent: false,
      statusCode: 200,
    };

    return expressLikeResponse;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser,
    info: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ExecutionContext,
  ): TUser {
    if (err) {
      throw new UnauthorizedException(err.message || 'Authentication failed');
    }

    if (!user) {
      const errorMessage =
        info instanceof Error
          ? info.message
          : typeof info === 'string'
            ? info
            : 'Authentication failed';
      throw new UnauthorizedException(errorMessage);
    }

    return user;
  }
}
