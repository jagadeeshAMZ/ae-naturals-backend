// src/common/messaging.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

@Injectable()
export class MessagingService {
  private sesClient: SESClient;

  constructor(private config: ConfigService) {
    this.sesClient = new SESClient({
      // Provide a fallback region or use non-null assertion
      region: this.config.get('AWS_REGION') || 'ap-south-1', 
      credentials: {
        // Use '!' to tell TypeScript these will definitely be provided by your .env
        accessKeyId: this.config.get('MY_AWS_ACCESS_KEY')!,
        secretAccessKey: this.config.get('MY_AWS_SECRET_KEY')!,
      },
    });
  }

  async sendSMS(phone: string, otp: string) {
    const apiKey = this.config.get('FAST2SMS_KEY');
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${otp}&numbers=${phone}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SMS Service failed: ${response.statusText}`);
    }
    return response.json();
  }

  async sendEmail(email: string, otp: string) {
    const command = new SendEmailCommand({
      Source: this.config.get('AWS_SES_SOURCE') || 'noreply@flowerfairy.com',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Your Flower Fairy Login OTP' },
        Body: { 
          Html: { Data: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>` } 
        },
      },
    });
    return this.sesClient.send(command);
  }
}