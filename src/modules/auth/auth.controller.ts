import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SignupTokenGuard } from './guards/signup-token.guard';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Step 1: Send OTP to email' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Step 2: Verify OTP → get temporary token' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('complete-signup')
  @UseGuards(SignupTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 3: Set password & complete registration' })
  async completeSignup(@Request() req, @Body() dto: CompleteSignupDto) {
    const email = req.user.email;
    return this.authService.completeSignup(email, dto);
  }
}
