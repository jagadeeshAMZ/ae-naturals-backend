// src/providers/implementations/payment/razorpay.provider.ts

import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PaymentProviderInterface } from '../../interfaces/provider.interfaces';

export class RazorpayProvider implements PaymentProviderInterface {
  private instance: Razorpay;
  private key_secret: string;
  private key_id: string;

  constructor(config: any) {
    if (!config.key_id || !config.key_secret) {
      throw new Error('Razorpay config incomplete');
    }

    this.key_id = config.key_id;
    this.key_secret = config.key_secret;

    this.instance = new Razorpay({
      key_id: config.key_id,
      key_secret: config.key_secret,
    });
  }

  async createOrder(orderId: string, amount: number, currency: string): Promise<any> {
    const order = await this.instance.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: orderId,
    });

    return {
      providerOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      provider: 'RAZORPAY',
      key_id: this.key_id,
    };
  }

  verifyPayment(paymentData: any): boolean {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", this.key_secret)
      .update(body)
      .digest("hex");

    return expectedSignature === razorpay_signature;
  }
}