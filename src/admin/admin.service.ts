import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path based on your folder structure

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    this.logger.log('Fetching dashboard statistics...');

    try {
      const [revenue, orders, users, products] = await Promise.all([
        this.prisma.order.aggregate({ 
          _sum: { totalAmount: true }, 
          where: { status: 'PAID' } 
        }),
        this.prisma.order.count(),
        this.prisma.user.count(),
        this.prisma.product.count({ where: { isActive: true } })
      ]);

      const stats = {
        revenue: revenue._sum.totalAmount || 0,
        orderCount: orders,
        userCount: users,
        productCount: products
      };

      // Detailed log for debugging data accuracy
      this.logger.debug(
        `Stats calculated: Revenue: ₹${stats.revenue}, Orders: ${stats.orderCount}, Users: ${stats.userCount}, Active Products: ${stats.productCount}`
      );

      return stats;

    } catch (error) {
      // Error log to catch database connection issues or query failures
      this.logger.error('Failed to fetch dashboard stats', error.stack);
      throw error; 
    }
  }
  // You can also add other admin-only methods here
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }
}