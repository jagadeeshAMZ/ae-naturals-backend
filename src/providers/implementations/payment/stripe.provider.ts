// src/providers/implementations/payment/stripe.provider.ts

import Stripe from 'stripe';
import { PaymentProviderInterface } from '../../interfaces/provider.interfaces';

export class StripeProvider implements PaymentProviderInterface {
  private stripe: Stripe;
  private config: any;

  constructor(config: any) {
    if (!config.secret_key) {
      throw new Error('Stripe config incomplete');
    }

    this.config = config;

    this.stripe = new Stripe(config.secret_key, {
      apiVersion: '2023-10-16' as any,
    });
  }

  async createOrder(orderId: string, amount: number, currency: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `Order #${orderId}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      client_reference_id: orderId,
      success_url: `${this.config.frontend_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.frontend_url}/payment/failed`,
    });

    return {
      providerOrderId: session.id,
      checkoutUrl: session.url,
      provider: 'STRIPE',
    };
  }
}