// src/providers/interfaces/provider.interfaces.ts

export interface EmailProviderInterface {
  send(to: string, subject: string, html: string): Promise<boolean>;
}

export interface SmsProviderInterface {
  send(phone: string, message: string): Promise<boolean>;
}

export interface PaymentProviderInterface {
  createOrder(orderId: string, amount: number, currency: string): Promise<any>;
  verifyPayment?(paymentData: any): boolean;
}