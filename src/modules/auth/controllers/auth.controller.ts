import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { JwtGuard } from '../guards/jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { SendOtpDto } from '../dto/send-otp.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── OTP FLOW ─────────────────────────────────────────────────────────────

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a 6-digit OTP to the provided email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
  async sendOtp(@Body() dto: SendOtpDto) {
    const data = await this.authService.sendOtp(dto);
    return { success: true, data };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the OTP sent to the email' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const data = await this.authService.verifyOtp(dto);
    return { success: true, data };
  }

  // ─── REGISTRATION ─────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data };
  }

  // ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register using Google OAuth credentials' })
  @ApiResponse({ status: 200, description: 'Google login successful.' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const data = await this.authService.googleLogin(dto);
    return { success: true, data };
  }

  // ─── ADMIN CREATION (SUPER_ADMIN only) ───────────────────────────────────

  @Post('create-admin')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an admin account (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Admin created successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. SUPER_ADMIN role required.',
  })
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.authService.createAdmin(dto, req.user.sub);
    return { success: true, data };
  }
}
