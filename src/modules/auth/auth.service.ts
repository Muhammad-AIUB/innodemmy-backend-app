/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  // Step 1: Send OTP
  async sendOtp(email: string): Promise<{ message: string; otp?: string }> {
    const count = await this.redisService.incrementOtpCount(email);
    if (count > 3) throw new BadRequestException('Too many attempts');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.setOtp(email, otp);
    await this.mailService.sendOtp(email, otp);

    // Development mode: OTP console এ print করো
    console.log(`🔐 OTP for ${email}: ${otp}`);

    // Development-এ response-এ OTP দাও
    if (process.env.NODE_ENV !== 'production') {
      return { message: 'OTP sent successfully', otp };
    }

    return { message: 'OTP sent successfully' };
  }

  // Step 2: Verify OTP → temporary token
  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ signupToken: string }> {
    const savedOtp = await this.redisService.getOtp(email);
    if (!savedOtp || savedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // OTP ম্যাচ → temporary token দে (১৫ মিনিট)
    const signupToken = this.jwtService.sign(
      { email, purpose: 'complete-signup' },
      { expiresIn: '15m' },
    );

    // OTP ডিলিট করে দে (একবারই ব্যবহার হবে)
    await this.redisService.deleteOtp(email);

    return { signupToken };
  }

  // Step 3: Complete signup
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
}
