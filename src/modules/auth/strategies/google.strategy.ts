import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleUser {
  googleId: string;
  googleName: string;
  googleEmail: string;
  googlePhoto?: string;
  accessToken: string;
}

interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.getOrThrow<string>(
      'GOOGLE_CLIENT_SECRET',
    );
    const callbackURL =
      configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3000/auth/google/callback',
      ) || 'http://localhost:3000/auth/google/callback';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    try {
      const { id, displayName, emails, photos } = profile;

      if (!emails || emails.length === 0) {
        throw new UnauthorizedException('Google account has no email');
      }

      const user: GoogleUser = {
        googleId: id,
        googleName: displayName,
        googleEmail: emails[0].value,
        googlePhoto: photos?.[0]?.value,
        accessToken,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      done(null, user);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      done(err, false);
    }
  }
}
