// src/providers/implementations/email/aws-ses.provider.ts

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailProviderInterface } from '../../interfaces/provider.interfaces';

export class AwsSesProvider implements EmailProviderInterface {
  private sesClient: SESClient;
  private from: string;

  constructor(private config: any) {
    if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.from) {
      throw new Error('AWS SES configuration is incomplete.');
    }

    this.from = config.from;

    this.sesClient = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    const command = new SendEmailCommand({
      Source: this.from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    });

    await this.sesClient.send(command);
    return true;
  }
}