// src/providers/implementations/sms/msg91.provider.ts

import axios from 'axios';
import { SmsProviderInterface } from '../../interfaces/provider.interfaces';

export class Msg91Provider implements SmsProviderInterface {
  private authKey: string;
  private templateId: string;

  constructor(private config: any) {
    if (!config.authKey || !config.templateId) {
      throw new Error('MSG91 configuration is incomplete.');
    }

    this.authKey = config.authKey;
    this.templateId = config.templateId;
  }

  async send(phone: string, message: string): Promise<boolean> {
    await axios.post(
      'https://control.msg91.com/api/v5/flow/',
      {
        template_id: this.templateId,
        short_url: '0',
        recipients: [
          { mobiles: phone, var1: message },
        ],
      },
      {
        headers: {
          authkey: this.authKey,
          'content-type': 'application/json',
        },
        timeout: 5000,
      },
    );

    return true;
  }
}