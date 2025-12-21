import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RedisService } from '../../shared/redis/redis.service';
import { MailService } from '../../shared/mail/mail.service';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { GoogleCompleteSignupDto } from './dto/google-complete-signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  // ===== Google OAuth Flow =====
  async handleGoogleAuth(profile: any): Promise<{ googleToken: string }> {
    const { googleId, googleEmail, googleName } = profile;

    // Check if user already exists
    let user = await this.userRepo.findOne({
      where: { googleId },
    });

    if (user) {
      // User already has Google account
      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      return { googleToken: accessToken };
    }

    // Store Google info in Redis for signup flow
    const googleToken = this.jwtService.sign(
      {
        googleId,
        googleEmail,
        googleName,
        purpose: 'google-signup',
      },
      { expiresIn: '30m' },
    );

    return { googleToken };
  }

  async addEmailAfterGoogle(
    googleId: string,
    email: string,
  ): Promise<{ message: string; verificationCode?: string }> {
    // Check if email already exists
    const existingUser = await this.userRepo.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Email already registered with another account',
      );
    }

    // Check OTP attempt limit
    const count = await this.redisService.incrementOtpCount(email);
    if (count > 3) {
      throw new BadRequestException('Too many attempts');
    }

    // Generate verification code (6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with Google ID
    await this.redisService.setOtp(
      `google-email-${email}`,
      JSON.stringify({ code, googleId }),
      900, // 15 minutes
    );

    // Send verification email
    await this.mailService.sendOtp(email, code);

    console.log(`🔐 Verification code for ${email}: ${code}`);

    if (process.env.NODE_ENV !== 'production') {
      return { message: 'Verification code sent', verificationCode: code };
    }

    return { message: 'Verification code sent to email' };
  }

  async verifyEmailAndCompleteGoogleSignup(
    email: string,
    code: string,
    dto: GoogleCompleteSignupDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    // Verify code
    const storedData = await this.redisService.getOtp(`google-email-${email}`);
    if (!storedData) {
      throw new UnauthorizedException('Verification code expired');
    }

    const { code: savedCode, googleId } = JSON.parse(storedData);
    if (savedCode !== code) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Validate password match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Get Google user info from Redis or query (you can store it)
    const googleInfo = await this.redisService.get(`google-signup-${googleId}`);
    const parsedGoogleInfo = googleInfo ? JSON.parse(googleInfo) : {};

    // Create user
    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      name: dto.fullName,
      googleId,
      googleEmail: parsedGoogleInfo.googleEmail || email,
      googleName: parsedGoogleInfo.googleName || dto.fullName,
      isVerified: true,
      isGoogleSignup: true,
    });

    await this.userRepo.save(user);

    // Clean up Redis
    await this.redisService.delete(`google-email-${email}`);
    await this.redisService.delete(`google-signup-${googleId}`);

    // Generate access token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // ===== Email OTP Flow (Original) =====
  async sendOtp(email: string): Promise<{ message: string; otp?: string }> {
    const count = await this.redisService.incrementOtpCount(email);
    if (count > 3) throw new BadRequestException('Too many attempts');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.setOtp(email, otp);
    await this.mailService.sendOtp(email, otp);

    console.log(`🔐 OTP for ${email}: ${otp}`);

    if (process.env.NODE_ENV !== 'production') {
      return { message: 'OTP sent successfully', otp };
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ signupToken: string }> {
    const savedOtp = await this.redisService.getOtp(email);
    if (!savedOtp || savedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const signupToken = this.jwtService.sign(
      { email, purpose: 'complete-signup' },
      { expiresIn: '15m' },
    );

    await this.redisService.deleteOtp(email);

    return { signupToken };
  }

  async completeSignup(
    email: string,
    dto: CompleteSignupDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      name: dto.name,
      phone: dto.phone,
      isVerified: true,
    });

    await this.userRepo.save(user);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // ===== Login =====
  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    // Find by email or name
    const user = await this.userRepo.findOne({
      where: [{ email: dto.emailOrName }, { name: dto.emailOrName }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email/name or password');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google login. Please use Google Sign-In',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email/name or password');
    }

    // Generate access token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
