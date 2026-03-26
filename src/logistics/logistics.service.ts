import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma";

@Injectable()
export class LogisticsService {
  constructor(private prisma: PrismaService) {}

  async calculateShipping(storeId: string, pincode: string) {
    const rule = await this.prisma.shippingRule.findFirst({
      where: { storeId, pincode },
    });

    if (!rule || !rule.isOperational) {
      throw new Error('Store is not accepting orders for this pincode.');
    }

    return { deliveryCharge: rule.deliveryCharge };
  }
}