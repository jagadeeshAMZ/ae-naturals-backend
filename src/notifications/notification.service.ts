import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as crypto from 'crypto'; // ✅ Use native crypto
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import type { Cache } from 'cache-manager';

@Injectable()
export class NotificationService {
  constructor(
    private emailService: EmailService,
    private smsService: SmsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Generates secure 6-digit OTP, saves to Redis/Cache with 5m expiry
  async sendOtp(identifier: string, isEmail: boolean = true) {
    const rateLimitKey = `rate_limit_${identifier}`;
    const attempts = (await this.cacheManager.get<number>(rateLimitKey)) || 0;
    
    if (attempts >= 3) {
      throw new BadRequestException('Too many OTP requests. Please wait 5 minutes.');
    }

    // ✅ Generate Cryptographically Secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    
    await this.cacheManager.set(`otp_${identifier}`, otp, 5 * 60 * 1000); 
    await this.cacheManager.set(rateLimitKey, attempts + 1, 5 * 60 * 1000);

    const message = `Your Verification Code is ${otp}. It will expire in 5 minutes.`;

    if (isEmail) {
      await this.emailService.sendEmail(identifier, 'Your OTP Code', `<h2>${message}</h2>`);
    } else {
      await this.smsService.sendSMS(identifier, message);
    }
    return { success: true, message: 'OTP sent successfully' };
  }

  async verifyOtp(identifier: string, otp: string) {
    const storedOtp = await this.cacheManager.get<string>(`otp_${identifier}`);
    if (!storedOtp) throw new BadRequestException('OTP expired or invalid');
    if (storedOtp !== otp) throw new BadRequestException('Incorrect OTP');

    await this.cacheManager.del(`otp_${identifier}`);
    await this.cacheManager.del(`rate_limit_${identifier}`);

    return { success: true, message: 'OTP verified successfully' };
  }

  async sendOrderConfirmation(user: { email: string; phone: string; name: string }, order: { id: string; amount: number }) {
    const emailHtml = `
      <h1>Thank you for your order, ${user.name}!</h1>
      <p>Your order ID is <strong>${order.id}</strong> for the amount of ₹${order.amount}.</p>
    `;
    const smsText = `Hi ${user.name}, your order ${order.id} for Rs.${order.amount} is confirmed.`;

    await Promise.allSettled([
      this.emailService.sendEmail(user.email, 'Order Confirmation', emailHtml),
      this.smsService.sendSMS(user.phone, smsText)
    ]);
  }
}