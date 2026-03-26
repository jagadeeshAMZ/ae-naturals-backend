// src/admin/admin.controller.ts
import { AuthGuard } from '@nestjs/passport';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin') // This maps to /api/v1/admin because of your global prefix
@UseGuards(AuthGuard('jwt'), AdminGuard) // Ensures only authorized admins reach this
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats') // This maps to /api/v1/admin/stats
  async getStats() {
    return this.adminService.getDashboardStats();
  }
}