// src/providers/implementations/sms/twilio.provider.ts

import { Twilio } from 'twilio';
import { SmsProviderInterface } from '../../interfaces/provider.interfaces';

export class TwilioProvider implements SmsProviderInterface {
  private client: Twilio;
  private fromNumber: string;

  constructor(private config: any) {
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      throw new Error('Twilio configuration is incomplete.');
    }

    this.fromNumber = config.fromNumber;

    this.client = new Twilio(config.accountSid, config.authToken);
  }

  async send(phone: string, message: string): Promise<boolean> {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: formattedPhone,
    });

    return true;
  }
}