import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleTokenStrategy extends PassportStrategy(
  Strategy,
  'google-token',
) {
  constructor(private readonly configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-key',
    });
  }

  validate(payload: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (payload.purpose !== 'google-signup') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      !payload.googleId ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      !payload.googleEmail ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      !payload.googleName
    ) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      googleId: payload.googleId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      googleEmail: payload.googleEmail,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      googleName: payload.googleName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      email: payload.googleEmail, // Also provide as email for compatibility
    };
  }
}
