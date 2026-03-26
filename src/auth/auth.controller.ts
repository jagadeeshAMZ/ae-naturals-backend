import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
// Change this line to a namespace import
import * as express from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}


 @Post('refresh')
  async refresh(
    @Request() req: express.Request // Type explicitly as express.Request
  ) {
    // This now matches the service signature exactly
    return this.authService.refreshTokens(req);
  }
@Get('me')
async getProfile(@Request() req: express.Request) {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { user, access_token } =
      await this.authService.getUserFromRefreshToken(refreshToken);

    return { user, access_token };
  } catch (err) {
    throw new UnauthorizedException('Invalid session');
  }
}
@Post('logout')
@UseGuards(AuthGuard('jwt')) //
async logout(
  @Request() req: any, 
  @Res({ passthrough: true }) res: express.Response
) {
  // 1. Clear the secure refresh token cookie
 res.clearCookie('refresh_token', {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
});

  // 2. Extract userId from the JWT payload attached by the Guard
  const userId = req.user.userId;

  // 3. Call the service to invalidate the Redis session
  return this.authService.logout(userId);
}
  @Post('send-otp')
  async sendOtp(@Body() body: { identifier: string; type: 'phone' | 'email' }) {
    return this.authService.sendOtp(body.identifier, body.type);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { identifier: string; otp: string },
    // Use express.Response here
    @Res({ passthrough: true }) res: express.Response,
  ) {
    return this.authService.verifyOtp(res, body.identifier, body.otp);
  }
}
