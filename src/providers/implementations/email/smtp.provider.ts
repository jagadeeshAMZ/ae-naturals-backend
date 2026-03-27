// src/providers/implementations/email/smtp.provider.ts

import { EmailProviderInterface } from '../../interfaces/provider.interfaces';
import * as nodemailer from 'nodemailer';

export class SmtpProvider implements EmailProviderInterface {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private config: any) {
    if (!config.host || !config.port || !config.user || !config.pass) {
      throw new Error('SMTP configuration is incomplete.');
    }

    this.from = config.user;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: config.pass,
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