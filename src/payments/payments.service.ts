// src/payments/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { StripeService } from './providers/stripe.service';
import { RazorpayService } from './providers/razorpay.service';
import { PhonePeService } from './providers/phonepe.service';

export type PaymentGateway = 'STRIPE' | 'RAZORPAY' | 'PHONEPE';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private razorpayService: RazorpayService,
    private phonepeService: PhonePeService,
  ) {}

  async initiateCheckout(orderId: string, provider: PaymentGateway, userId: string) {
    const order = await this.prisma.order.findUnique({ 
      where: { id: orderId },
      include: { store: true } 
    });
    
    if (!order) throw new BadRequestException('Order not found');
    
    const amount = order.totalAmount; 
    const currency = 'INR';

    // Extract tenant-specific API keys (White-label)
    const storePaymentKeys = (order.store.paymentConfig as Record<string, string>) || {};

    switch (provider) {
      case 'STRIPE':
        return this.stripeService.createCheckout(order.id, amount, currency, storePaymentKeys);
      case 'RAZORPAY':
        return this.razorpayService.createOrder(order.id, amount, currency, storePaymentKeys);
      case 'PHONEPE':
        return this.phonepeService.createPayment(order.id, amount, userId, storePaymentKeys);
      default:
        throw new BadRequestException('Invalid provider');
    }
  }

  async markOrderPaid(paymentId: string) {
    return await this.prisma.order.update({
      where: { paymentProviderId: paymentId },
      data: { status: 'PAID' }, 
    });
  }
}