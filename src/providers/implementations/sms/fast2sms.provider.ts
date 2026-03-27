// src/providers/implementations/sms/fast2sms.provider.ts

import axios from 'axios';
import { SmsProviderInterface } from '../../interfaces/provider.interfaces';

export class Fast2SmsProvider implements SmsProviderInterface {
  private apiKey: string;

  constructor(private config: any) {
    if (!config.apiKey) {
      throw new Error('Fast2SMS configuration is incomplete.');
    }

    this.apiKey = config.apiKey;
  }

  async send(phone: string, message: string): Promise<boolean> {
    await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: phone,
      },
      {
        headers: { authorization: this.apiKey },
        timeout: 5000,
      },
    );

    return true;
  }
}