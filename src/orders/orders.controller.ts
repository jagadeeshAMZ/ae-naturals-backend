// src/orders/orders.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private ordersService: OrdersService) {}

  @Post('create')
  async create(@Req() req, @Body('storeId') storeId: string) {
    // DEBUG: Logs to verify data arrival before service call
    this.logger.log(`Incoming Order Request | User: ${req.user?.userId} | Store: ${storeId}`);
    
    return this.ordersService.createOrder(req.user.userId, storeId);
  }

  @Get('my-orders')
  async list(@Req() req) {
    return this.ordersService.getMyOrders(req.user.userId);
  }
}