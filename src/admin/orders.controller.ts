// src/admin/orders.controller.ts
import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { OrderStatus } from '@prisma/client'; 
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin/orders')
@UseGuards(AuthGuard('jwt'), AdminGuard) // Ensure protection is active
export class AdminOrdersController {
  constructor(private prisma: PrismaService) {}

  // Added this to handle the GET /api/v1/admin/orders request
  @Get()
  async getAllOrders() {
    return this.prisma.order.findMany({
      include: { 
        user: true // Includes customer details
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: OrderStatus }
  ) {
    return this.prisma.order.update({
      where: { id },
      data: { status: body.status }
    });
  }
}