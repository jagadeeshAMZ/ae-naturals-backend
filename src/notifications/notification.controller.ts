// notification.controller.ts
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send-otp')
  async sendOtp(@Body() body: { identifier: string; isEmail: boolean }) {
    return this.notificationService.sendOtp(body.identifier, body.isEmail);
  }

  @Post('verify-otp')
  @HttpCode(200)
  async verifyOtp(@Body() body: { identifier: string; otp: string }) {
    return this.notificationService.verifyOtp(body.identifier, body.otp);
  }
}