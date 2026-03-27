// src/providers/implementations/sms/msg91.provider.ts
import { SmsProviderInterface } from '../../interfaces/provider.interfaces';
import axios from 'axios';

export class Msg91Provider implements SmsProviderInterface {
  constructor(private config: any) {}

  async send(phone: string, message: string): Promise<boolean> {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    // Extract the 6-digit code from the message string
    const otpCode = message.match(/\d{6}/)?.[0] || message;

    try {
      const response = await axios.post(
        'https://control.msg91.com/api/v5/flow/',
        {
          template_id: this.config.templateId,
          short_url: '0',
          recipients: [
            {
              mobiles: cleanPhone,
              // 🔥 MATCH THIS TO YOUR TEMPLATE: Changed 'var1' to 'OTP'
              OTP: otpCode,
            },
          ],
        },
        {
          headers: {
            authkey: this.config.authKey,
            'content-type': 'application/json',
          },
        },
      );
      return true;
    } catch (error) {
      throw new Error(`MSG91 Error: ${error.message}`);
    }
  }
}
