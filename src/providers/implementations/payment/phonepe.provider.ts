// src/providers/implementations/payment/phonepe.provider.ts

import axios from 'axios';
import * as crypto from 'crypto';
import { PaymentProviderInterface } from '../../interfaces/provider.interfaces';

export class PhonepeProvider implements PaymentProviderInterface {
  private config: any;

  constructor(config: any) {
    if (!config.merchant_id || !config.salt_key || !config.salt_index) {
      throw new Error('PhonePe configuration is incomplete.');
    }
    this.config = config;
  }

  async createOrder(orderId: string, amount: number, currency: string): Promise<any> {
    const amountInPaise = Math.round(amount * 100);
    const endpoint = '/pg/v1/pay';

    const payload = {
      merchantId: this.config.merchant_id,
      merchantTransactionId: orderId,
      merchantUserId: `USER_${Date.now()}`,
      amount: amountInPaise,
      redirectUrl: `${this.config.frontend_url}/payment/success`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${this.config.backend_webhook_url}/phonepe/webhook`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    const stringToHash = base64Payload + endpoint + this.config.salt_key;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = `${sha256}###${this.config.salt_index}`;

    const baseUrl = this.config.is_production === 'true'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    const response = await axios.post(
      `${baseUrl}${endpoint}`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      }
    );

    return {
      providerOrderId: orderId,
      checkoutUrl: response.data.data.instrumentResponse.redirectInfo.url,
      provider: 'PHONEPE',
    };
  }

  verifyPayment(paymentData: any): boolean {
    const { response, 'x-verify': receivedChecksum } = paymentData;

    const stringToHash = response + this.config.salt_key;
    const calculatedChecksum =
      crypto.createHash('sha256').update(stringToHash).digest('hex') +
      '###' +
      this.config.salt_index;

    return calculatedChecksum === receivedChecksum;
  }
}