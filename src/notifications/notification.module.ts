// notification.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ProvidersModule } from 'src/providers/providers.module';
import { EncryptionModule } from 'src/common/security/encryption.module';

@Module({
  imports: [
    ConfigModule,
    CacheModule.register(), // Will use Redis if configured globally, otherwise memory
    ProvidersModule,
    EncryptionModule,
  ],
  controllers: [NotificationController],
  providers: [EmailService, SmsService, NotificationService],
// ✅ FIX: Export Email and SMS services so AuthModule can use them
  exports: [NotificationService, EmailService, SmsService],
})
export class NotificationModule {}