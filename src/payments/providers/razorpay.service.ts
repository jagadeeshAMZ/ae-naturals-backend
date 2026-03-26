// src/payments/providers/razorpay.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RazorpayService {
  constructor(private prisma: PrismaService) {}

  async createOrder(orderId: string, amount: number, currency: string, keys: any = {}) {
    const key_id = keys.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const key_secret = keys.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
    
    const razorpay = new Razorpay({ key_id, key_secret });

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: orderId,
    };

    const order = await razorpay.orders.create(options);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentProviderId: order.id, paymentProvider: 'RAZORPAY' },
    });

    return { 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency,
      keyId: key_id 
    };
  }

  verifySignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string, keys: any = {}) {
    const key_secret = keys.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', key_secret as string)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new BadRequestException('Invalid Razorpay signature');
    }
    return true;
  }
}