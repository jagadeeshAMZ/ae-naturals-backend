// src/orders/orders.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { PrismaModule } from '../prisma/prisma.module';
// ✅ Import the NotificationModule
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    forwardRef(() => CartModule), // Import the module containing CartService
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}