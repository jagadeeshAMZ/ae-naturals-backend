// src/payments/providers/stripe.service.ts
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StripeService {
  constructor(private prisma: PrismaService) {}

  async createCheckout(orderId: string, amount: number, currency: string, keys: any = {}) {
    const secret = keys.stripeSecret || process.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(secret as string, { apiVersion: '2023-10-16' as any });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { 
          currency, 
          product_data: { name: `Order #${orderId.substring(0, 8)}` }, 
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_API_URL}/checkout/success?order_id=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/checkout/cancel`,
      client_reference_id: orderId,
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentProviderId: session.id, paymentProvider: 'STRIPE' },
    });

    return { url: session.url };
  }

  verifyWebhook(rawBody: Buffer, signature: string, keys: any = {}) {
    const secret = keys.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = new Stripe(keys.stripeSecret || process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-10-16' as any });
    return stripe.webhooks.constructEvent(rawBody, signature, secret as string);
  }
}