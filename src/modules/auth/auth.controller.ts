import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { AddEmailDto } from './dto/add-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleCompleteSignupDto } from './dto/google-complete-signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SignupTokenGuard } from './guards/signup-token.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleTokenGuard } from './guards/google-token.guard';

interface AuthenticatedUser {
  email?: string;
  googleId?: string;
  googleEmail?: string;
  googleName?: string;
  id?: string;
  role?: string;
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthenticatedUser;
}

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===== Google OAuth Flow =====
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Step 1: Redirect to Google OAuth' })
  async googleAuth() {
    // GoogleOAuthGuard handles the redirect automatically
    // This method should not be reached if redirect works properly
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth Callback' })
  async googleAuthCallback(@Request() req: AuthenticatedRequest) {
    try {
      if (!req.user) {
        throw new HttpException(
          'User not found in request',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.authService.handleGoogleAuth(req.user);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('google/add-email')
  @UseGuards(GoogleTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 2: After Google Auth, add email' })
  async addEmailAfterGoogle(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AddEmailDto,
  ) {
    if (!req.user?.googleId) {
      throw new HttpException('Google ID is required', HttpStatus.UNAUTHORIZED);
    }
    return this.authService.addEmailAfterGoogle(req.user.googleId, dto.email);
  }

  @Post('google/verify-email')
  @UseGuards(GoogleTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 3: Verify email code from Google flow' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyEmailAfterGoogle(@Body() _dto: VerifyEmailDto) {
    // Note: DTO is required for API documentation but not used in this endpoint
    return {
      message: 'Email verified. Proceed to complete-signup with password',
      requiresPassword: true,
    };
  }

  @Post('google/complete-signup')
  @UseGuards(GoogleTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 4: Create account with password' })
  async completeGoogleSignup(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GoogleCompleteSignupDto,
  ) {
    const email =
      req.user?.email ||
      req.user?.googleEmail ||
      (typeof req.headers['x-user-email'] === 'string'
        ? req.headers['x-user-email']
        : undefined);
    const code =
      typeof req.headers['x-verification-code'] === 'string'
        ? req.headers['x-verification-code']
        : undefined;

    if (!email || !code) {
      throw new HttpException(
        'Email and verification code are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.authService.verifyEmailAndCompleteGoogleSignup(
      email,
      code,
      dto,
    );
  }

  // ===== Email OTP Flow (Original) =====
  @Post('send-otp')
  @ApiOperation({ summary: 'Step 1: Send OTP to email (Email signup)' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Step 2: Verify OTP (Email signup)' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('complete-signup')
  @UseGuards(SignupTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 3: Complete signup with password' })
  async completeSignup(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CompleteSignupDto,
  ) {
    if (!req.user?.email) {
      throw new Error('Email not found in request');
    }
    const email = req.user.email;
    return this.authService.completeSignup(email, dto);
  }

  // ===== Login =====
  @Post('login')
  @ApiOperation({
    summary: 'Login with email/fullName + password',
  })
  async login(@Request() req: AuthenticatedRequest, @Body() dto: LoginDto) {
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      undefined;
    return this.authService.login(dto, userAgent, ipAddress);
  }

  // ===== Refresh Token =====
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try {
      return await this.authService.refreshAccessToken(dto.refreshToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Token refresh failed';
      throw new HttpException(message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout and revoke refresh token',
  })
  async logout(@Body() dto: RefreshTokenDto) {
    try {
      await this.authService.revokeRefreshToken(dto.refreshToken);
      return { message: 'Logged out successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
