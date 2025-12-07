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
}
