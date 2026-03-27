// src/providers/implementations/email/smtp.provider.ts

import { EmailProviderInterface } from '../../interfaces/provider.interfaces';
import * as nodemailer from 'nodemailer';

export class SmtpProvider implements EmailProviderInterface {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private config: any) {
    const password = config.pass || config.password;

    if (!config.host || !config.user || !password) {
      throw new Error('SMTP configuration is incomplete.');
    }
    console.log('SMTP Config:', {
      host: config.host,
      port: config.port,
      user: config.user,
      pass: password, // Don't log the actual password
    });
    this.from = config.user;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: password,
      },
    });
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
    });

    return true;
  }
}
