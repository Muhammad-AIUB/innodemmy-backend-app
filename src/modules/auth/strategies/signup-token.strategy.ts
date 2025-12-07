import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SignupTokenStrategy extends PassportStrategy(
  Strategy,
  'signup-jwt',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-key',
    });
  }

  validate(payload: any) {
    if (payload.purpose !== 'complete-signup') {
      throw new UnauthorizedException('Invalid token purpose');
    }
    return { email: payload.email };
  }
}
