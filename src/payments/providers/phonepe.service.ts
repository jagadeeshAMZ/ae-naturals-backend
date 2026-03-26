// src/payments/providers/phonepe.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PhonePeService {
  private readonly baseUrl = process.env.PHONEPE_ENV === 'PROD' 
    ? 'https://api.phonepe.com/apis/hermes' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

  constructor(private prisma: PrismaService, private httpService: HttpService) {}

  async createPayment(orderId: string, amount: number, userId: string, keys: any = {}) {
    const merchantId = keys.phonepeMerchantId || process.env.PHONEPE_MERCHANT_ID;
    const saltKey = keys.phonepeSaltKey || process.env.PHONEPE_SALT_KEY;
    const saltIndex = keys.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || '1';

    const transactionId = `TXN_${orderId.replace(/-/g, '')}`;
    
    const payload = {
      merchantId: merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: userId,
      amount: Math.round(amount * 100),
      redirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/phonepe/callback`,
      redirectMode: 'POST',
      callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/phonepe/webhook`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(base64Payload, '/pg/v1/pay', saltKey, saltIndex);

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/pg/v1/pay`, { request: base64Payload }, {
        headers: { 'X-VERIFY': checksum, 'Content-Type': 'application/json' },
      })
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentProviderId: transactionId, paymentProvider: 'PHONEPE' },
    });

    return { url: response.data.data.instrumentResponse.redirectInfo.url };
  }

  private generateChecksum(base64Payload: string, endpoint: string, saltKey: string, saltIndex: string) {
    const stringToHash = base64Payload + endpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${sha256}###${saltIndex}`;
  }

  verifyChecksum(responseBase64: string, providedChecksum: string, keys: any = {}) {
    const saltKey = keys.phonepeSaltKey || process.env.PHONEPE_SALT_KEY;
    const saltIndex = keys.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || '1';
    
    const calculatedChecksum = this.generateChecksum(responseBase64, '', saltKey as string, saltIndex as string); 
    if (calculatedChecksum !== providedChecksum) {
      throw new BadRequestException('Invalid PhonePe Checksum');
    }
    return true;
  }
}