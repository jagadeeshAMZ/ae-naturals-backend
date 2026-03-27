// src/providers/provider.registry.ts

import { SmtpProvider } from './implementations/email/smtp.provider';
import { AwsSesProvider } from './implementations/email/aws-ses.provider';
import { SendGridProvider } from './implementations/email/sendgrid.provider';

import { Fast2SmsProvider } from './implementations/sms/fast2sms.provider';
import { Msg91Provider } from './implementations/sms/msg91.provider';
import { TwilioProvider } from './implementations/sms/twilio.provider';

import { RazorpayProvider } from './implementations/payment/razorpay.provider';
import { StripeProvider } from './implementations/payment/stripe.provider';

export const PROVIDER_REGISTRY = {
  EMAIL: {
    SMTP: SmtpProvider,
    AWS_SES: AwsSesProvider,
    SENDGRID: SendGridProvider,
  },
  SMS: {
    FAST2SMS: Fast2SmsProvider,
    MSG91: Msg91Provider,
    TWILIO: TwilioProvider,
  },
  PAYMENT: {
    RAZORPAY: RazorpayProvider,
    STRIPE: StripeProvider,
  },
};