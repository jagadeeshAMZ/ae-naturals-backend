// src/providers/implementations/payment/payu.provider.ts

import * as crypto from 'crypto';
import { PaymentProviderInterface } from '../../interfaces/provider.interfaces';

export class PayuProvider implements PaymentProviderInterface {
  private config: any;

  constructor(config: any) {
    if (!config.merchant_key || !config.merchant_salt) {
      throw new Error('PayU configuration is incomplete.');
    }
    this.config = config;
  }

  async createOrder(orderId: string, amount: number, currency: string): Promise<any> {
    const txnid = orderId;
    const productinfo = 'Order Payment';
    const firstname = 'Customer';
    const email = 'customer@example.com';

    const hashString = `${this.config.merchant_key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${this.config.merchant_salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const actionUrl = this.config.is_production === 'true'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment';

    return {
      providerOrderId: txnid,
      provider: 'PAYU',
      formPayload: {
        key: this.config.merchant_key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        surl: `${this.config.frontend_url}/payment/success`,
        furl: `${this.config.frontend_url}/payment/failed`,
        hash,
        actionUrl
      }
    };
  }

  verifyPayment(paymentData: any): boolean {
    const { status, email, firstname, productinfo, amount, txnid, hash: receivedHash } = paymentData;

    const reverseHashString = `${this.config.merchant_salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${this.config.merchant_key}`;
    const calculatedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

    return calculatedHash === receivedHash;
  }
}