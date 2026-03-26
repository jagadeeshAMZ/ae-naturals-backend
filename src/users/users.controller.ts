// src/users/users.controller.ts
import { 
  Controller, 
  Get, 
  Query, 
  Res, 
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import * as express from 'express'; // Required to avoid TS1272 with emitDecoratorMetadata

@Controller('users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService, // Injected to handle session generation
  ) {}

  @Get('check-admin')
  async checkAdmin(
    @Query('email') email: string,
    @Res({ passthrough: true }) res: express.Response // Explicit namespace reference
  ) {
    console.log(`[USERS] Admin check initiated for: ${email}`);
    
    // Validate input to prevent null pointer issues in service calls
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true }
    });

    // Whitelist check: only grant access if user exists and has ADMIN role
    if (!user || user.role !== 'ADMIN') {
      console.warn(`[USERS] Unauthorized access attempt: ${email}`);
      return { isAdmin: false };
    }

    // Safety check for TypeScript strict null checks
    if (!user.email) {
      throw new BadRequestException('User found but email is missing in database record');
    }

    /**
     * Generate a production-grade session.
     * This helper method in AuthService should:
     * 1. Generate an Access Token.
     * 2. Generate a Refresh Token.
     * 3. Set the 'refresh_token' HttpOnly cookie on the response object.
     * 4. Sync the session to Redis.
     */
    const accessToken = await this.authService.generateAdminSession(res, user.id, user.email);
    
    console.log(`[USERS] Admin session successfully established for: ${email}`);

    return { 
      isAdmin: true, 
      accessToken,
      user: { id: user.id, email: user.email, role: user.role }
    };
  }
}