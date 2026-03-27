// src/providers/implementations/email/sendgrid.provider.ts

import * as sgMail from '@sendgrid/mail';
import { EmailProviderInterface } from '../../interfaces/provider.interfaces';

export class SendGridProvider implements EmailProviderInterface {
  private from: string;

  constructor(private config: any) {
    if (!config.apiKey || !config.from) {
      throw new Error('SendGrid configuration is incomplete.');
    }

    this.from = config.from;

    // ✅ Initialize once
    sgMail.setApiKey(config.apiKey);
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    await sgMail.send({
      to,
      from: this.from,
      subject,
      html,
    });

    return true;
  }
}