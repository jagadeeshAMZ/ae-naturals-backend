import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppCacheService } from 'src/common/cache/cache.service';
// Add these imports (adjust path based on where you saved the notification files)
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';




@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private cacheService: AppCacheService,
    // Inject the new services here instead of MessagingService
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async getUserFromRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      // ✅ Check Redis session
      const sessionKey = `session:${payload.sub}`;
      const activeSession = await this.cacheService.get(sessionKey);

      if (!activeSession) {
        throw new UnauthorizedException('Session expired');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessExpiry =
        this.config.get<string>('JWT_ACCESS_EXPIRY') || '15m';

      const accessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: accessExpiry as any,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        access_token: accessToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  /**
   * Generates a new Access Token using a valid Refresh Token from cookies
   */
  async refreshTokens(req: Request) {
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      // Verification: Ensure the session still exists in Redis
      const sessionKey = `session:${payload.sub}`;
      const activeSession = await this.cacheService.get(sessionKey);

      if (!activeSession) {
        throw new UnauthorizedException('Session has been invalidated');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) throw new UnauthorizedException();

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: 'default-store',
      };

      // FIX: Cast string from config to 'any' to match JwtSignOptions requirements
      const accessExpiry =
        this.config.get<string>('JWT_ACCESS_EXPIRY') || '15m';

      const accessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: accessExpiry as any,
      });

      return { access_token: accessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Standard Email/Password login (if needed)
   */
  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    // Track session in Redis
    await this.cacheService.set(
      `session:${user.id}`,
      accessToken,
      30 * 24 * 60 * 60,
    );

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Generates and sends a 6-digit OTP
   */
  async sendOtp(identifier: string, type: 'phone' | 'email') {
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES') || 5;
    const expires = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    // Clean up old tokens for this identifier
    await this.prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await this.prisma.verificationToken.create({
      data: { identifier, token: hashedOtp, expires },
    });

    this.logger.log(`Generated OTP for ${identifier}: ${otp} (expires in ${expiryMinutes} minutes)`);
    
    // ✅ NEW NOTIFICATION INTEGRATION
    const message = `Your Flower Fairy Login OTP is ${otp}. It expires in ${expiryMinutes} minutes.`;
    
    try {
      if (type === 'phone') {
        await this.smsService.sendSMS(identifier, message);
      } else {
        const html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Flower Fairy Login</h2>
                        <p>Your OTP is <strong style="font-size: 24px;">${otp}</strong>.</p>
                        <p>It expires in ${expiryMinutes} minutes.</p>
                      </div>`;
        await this.emailService.sendEmail(identifier, 'Your Flower Fairy Login OTP', html);
      }
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${identifier}: ${error.message}`);
      // Depending on your requirements, you might want to throw an error here so the frontend knows it failed
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verifies OTP, upserts user, sets 30-day cookie, and creates Redis session
   */

  async verifyOtp(res: Response, identifier: string, otp: string) {
    this.logger.log(
      `[OTP VERIFY] Verification started for identifier: ${identifier}`,
    );

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    this.logger.debug(`[OTP HASH] OTP hashed for secure comparison`);

    const record = await this.prisma.verificationToken.findFirst({
      where: { identifier, token: hashedOtp },
    });

    if (!record) {
      this.logger.warn(
        `[OTP VERIFY FAILED] No matching OTP record found for ${identifier}`,
      );
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (record.expires < new Date()) {
      this.logger.warn(
        `[OTP EXPIRED] OTP expired for identifier: ${identifier}`,
      );
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    this.logger.log(`[OTP VALID] OTP verified successfully for ${identifier}`);

    await this.prisma.verificationToken.deleteMany({ where: { identifier } });
    this.logger.debug(
      `[OTP CLEANUP] Old OTP records removed for ${identifier}`,
    );

    const user = await this.prisma.user.upsert({
      where: identifier.includes('@')
        ? { email: identifier }
        : { phone: identifier },
      update: { lastLogin: new Date() },
      create: {
        email: identifier.includes('@') ? identifier : null,
        phone: identifier.includes('@') ? null : identifier,
        name: identifier.split('@')[0],
        role: 'USER',
        password: '',
      },
    });

    this.logger.log(
      `[USER UPSERT] User session created/updated | ID: ${user.id}`,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      tenantId: 'default-store',
    };

    const redisTtl = this.config.get<number>('REDIS_SESSION_TTL') || 2592000;
    const cookieMaxAge =
      this.config.get<number>('COOKIE_MAX_AGE') || 2592000000;

    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d';

    this.logger.debug(
      `[JWT CONFIG] Access expiry: ${accessExpiry} | Refresh expiry: ${refreshExpiry}`,
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiry as any,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      { expiresIn: refreshExpiry as any },
    );
    this.logger.debug(
      `[ACCESS TOKEN] ${accessToken.substring(0, 20)}... (truncated)`,
    );
    this.logger.debug(
      `[REFRESH TOKEN] ${refreshToken.substring(0, 20)}... (truncated)`,
    );

    this.logger.log(
      `[TOKEN GENERATED] Access & Refresh tokens generated for user ${user.id}`,
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'false',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      // Use 'lax' for better cross-site compatibility in dev
      maxAge: Number(cookieMaxAge),
      path: '/', // Changed from '/auth/refresh'
    });

    this.logger.debug(`[COOKIE SET] Refresh token cookie stored securely`);

    await this.cacheService.set(
      `session:${user.id}`,
      'active',
      Number(redisTtl),
    );

    this.logger.log(
      `[REDIS SESSION] Active session stored in Redis | Key: session:${user.id}`,
    );

    this.logger.log(
      `[LOGIN SUCCESS] User authenticated successfully | ID: ${user.id}`,
    );

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Clears the session from Redis
   */
  async logout(userId: string) {
    const sessionKey = `session:${userId}`;

    try {
      await this.cacheService.del(sessionKey);
    } catch (error) {
      console.error('Redis session invalidation failed:', error);
    }

    return { message: 'Logged out successfully' };
  }
  async generateAdminSession(res: Response, userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
      role: 'ADMIN',
      type: 'oauth_admin',
    };

    // 1. Load config values for security and persistence
    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d';
    const redisTtl = this.config.get<number>('REDIS_SESSION_TTL') || 2592000;
    const cookieMaxAge =
      this.config.get<number>('COOKIE_MAX_AGE') || 2592000000;

    // 2. Sign Tokens
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiry as any,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      { expiresIn: refreshExpiry as any },
    );

    // 3. Set secure HttpOnly cookie
    // Path is set to '/' so frontend interceptors can access it from any route
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: Number(cookieMaxAge),
      path: '/',
    });

    // 4. Sync with Redis session tracking for instant revocation
    try {
      await this.cacheService.set(
        `session:${userId}`,
        'active',
        Number(redisTtl),
      );
    } catch (err) {
      console.error(
        `[REDIS ERROR] Failed to track admin session: ${err.message}`,
      );
    }

    return accessToken;
  }
}
