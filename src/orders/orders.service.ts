// src/orders/orders.service.ts
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
// Import the NotificationService
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    // Inject NotificationService
    private notificationService: NotificationService,
  ) {}

  async createOrder(userId: string, storeId: string) {
    // 1. Validation: Prevent P2003 error by checking store existence
    const store = await this.prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      this.logger.error(`FAILED: Store ID ${storeId} does not exist.`);
      throw new NotFoundException(`Store with ID ${storeId} not found.`);
    }

    // 2. Fetch current cart
    const cart = await this.cartService.getCart(userId);
    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty. Add items before checking out.');
    }

    // 3. Calculate Total Amount
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );

    // 4. Atomic Database Transaction
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        // Create the Order and OrderItems
        const newOrder = await tx.order.create({
          data: {
            userId, // Uses userId string from strategy
            storeId,
            totalAmount,
            status: 'PENDING',
            items: {
              create: cart.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price // Snapshot for history
              }))
            }
          }
        });

        // Clear the cart items in DB using the transaction client
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });

        return newOrder;
      });

      // 5. Cleanup: Invalidate Redis Cache after DB success
      await this.cartService.invalidateCache(userId);
// ✅ 6. NEW: Send Order Confirmation Notification (Async, non-blocking)
      this.sendOrderNotificationsAsync(userId, order).catch(err => 
        this.logger.error(`Failed to send order notification: ${err.message}`)
      );

      return order;

    } catch (error) {
      this.logger.error(`TRANSACTION FATAL: ${error.message}`);
      throw new BadRequestException('Order processing failed. Please try again.');
    }
  }

  // Helper method so notification delays don't block the API response
  private async sendOrderNotificationsAsync(userId: string, order: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.notificationService.sendOrderConfirmation(
        { 
          email: user.email || '', 
          phone: user.phone || '', 
          name: user.name || 'Customer' 
        },
        { 
          id: order.id, 
          amount: order.totalAmount 
        }
      );
    }
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { 
        items: { 
          include: { product: true } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}