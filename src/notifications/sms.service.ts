// src\notifications\sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from '../providers/provider.factory';
import { AppCacheService } from '../common/cache/cache.service';
import { EncryptionService } from '../common/security/encryption.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly CACHE_KEY = 'sms_providers_config';

  constructor(
    private prisma: PrismaService,
    private providerFactory: ProviderFactory,
    private cacheService: AppCacheService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Sends an SMS using a resilient dynamic fallback strategy.
   * It strictly respects the 'isActive' flag in the database.
   */
  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      // 1. Get ONLY active SMS providers ordered by priority (1 is highest)
      const providers = await this.getActiveProviders();

      if (!providers || providers.length === 0) {
        this.logger.warn('No active SMS providers configured. SMS not sent.');
        return false;
      }

      // 2. Iterate through available active providers (Automatic Fallback Loop)
      for (const item of providers) {
        try {
          // 3. Decrypt the database configuration
          const decryptedConfig = JSON.parse(
            this.encryption.decrypt(item.config),
          );

          this.logger.log(`Attempting SMS via ${item.provider} to ${phone}`);

          // 4. Initialize provider implementation via Factory
          const provider = this.providerFactory.getProvider(
            'SMS', 
            item.provider, 
            decryptedConfig,
          );

          // 5. Attempt to send
          // 🔥 SYNCED: Changed from sendSms to send to match SmsProviderInterface
          await provider.send(phone, message);

          this.logger.log(`SMS sent successfully via ${item.provider}`);

          // Log success to Database for auditing
          await this.logNotification('SMS', item.provider, phone, 'SUCCESS');
          return true; // Success! Exit the loop.

        } catch (err) {
          this.logger.error(`❌ Provider ${item.provider} failed: ${err.message}`);

          // Log failure to Database
          await this.logNotification(
            'SMS',
            item.provider,
            phone,
            'FAILED',
            err.message,
          );

          // Continue to next provider in loop...
          this.logger.warn(`Switching to next available SMS fallback...`);
        }
      }

      return false; // All active providers failed
    } catch (globalError) {
      this.logger.error(
        `Critical failure in SmsService: ${globalError.message}`,
      );
      return false;
    }
  }

  /**
   * Fetches active SMS providers from Cache or Database.
   */
  private async getActiveProviders() {
    return await this.cacheService.getOrSet(
      this.CACHE_KEY,
      async () => {
        return await this.prisma.providerConfig.findMany({
          where: {
            type: 'SMS',
            isActive: true, // Only fetch enabled providers
          },
          orderBy: { priority: 'asc' }, // Respect priority order
        });
      },
      300, // Cache for 5 minutes
    );
  }

  /**
   * Logs notification attempts for auditing.
   */
  private async logNotification(
    type: string,
    provider: string,
    recipient: string,
    status: string,
    error?: string,
  ) {
    try {
      await this.prisma.notificationLog.create({
        data: { type, provider, recipient, status, error },
      });
    } catch (logError) {
      this.logger.error(`Failed to log notification: ${logError.message}`);
    }
  }

  /**
   * Invalidate cache when DB configs change (e.g., from Admin UI)
   */
  async invalidateProviderCache() {
    await this.cacheService.del(this.CACHE_KEY);
    this.logger.log('SMS provider cache invalidated.');
  }
}