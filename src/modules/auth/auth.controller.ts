import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { AddEmailDto } from './dto/add-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleCompleteSignupDto } from './dto/google-complete-signup.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SignupTokenGuard } from './guards/signup-token.guard';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===== Google OAuth Flow =====
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Step 1: Redirect to Google OAuth' })
  async googleAuth() {
    // Passport handles the redirect
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth Callback' })
  async googleAuthCallback(@Request() req) {
    return this.authService.handleGoogleAuth(req.user);
  }

  @Post('google/add-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 2: After Google Auth, add email' })
  async addEmailAfterGoogle(
    @Request() req,
    @Body() dto: AddEmailDto,
  ) {
    const googleId = req.user?.googleId || req.headers['x-google-id'];
    return this.authService.addEmailAfterGoogle(googleId, dto.email);
  }

  @Post('google/verify-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 3: Verify email code from Google flow' })
  async verifyEmailAfterGoogle(
    @Request() req,
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    const googleId = req.user?.googleId || req.headers['x-google-id'];
    const email = req.user?.email || req.headers['x-user-email'];

    return {
      message:
        'Email verified. Proceed to complete-signup with password',
      requiresPassword: true,
    };
  }

  @Post('google/complete-signup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 4: Create account with password' })
  async completeGoogleSignup(
    @Request() req,
    @Body() dto: GoogleCompleteSignupDto,
  ) {
    const googleId = req.user?.googleId || req.headers['x-google-id'];
    const email = req.user?.email || req.headers['x-user-email'];
    const code = req.headers['x-verification-code'];

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
  async completeSignup(@Request() req, @Body() dto: CompleteSignupDto) {
    const email = req.user.email;
    return this.authService.completeSignup(email, dto);
  }

  // ===== Login =====
  @Post('login')
  @ApiOperation({
    summary:
      'Login with email/fullName + password',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
