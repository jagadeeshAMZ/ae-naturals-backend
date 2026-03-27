import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from '../providers/provider.factory';
import { AppCacheService } from '../common/cache/cache.service';
import { EncryptionService } from '../common/security/encryption.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly CACHE_KEY = 'email_providers_config';

  constructor(
    private prisma: PrismaService,
    private providerFactory: ProviderFactory,
    private cacheService: AppCacheService,
    private encryption: EncryptionService,
  ) {
    // 🛑 No AWS or SMTP initialization here!
    // We fetch credentials from the database when needed.
  }

  /**
   * Sends an email using a resilient dynamic fallback strategy.
   * It strictly respects the 'isActive' flag in the database.
   */
  // src/email/email.service.ts

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const providers = await this.getActiveProviders();

    for (const item of providers) {
      try {
        const decryptedConfig = JSON.parse(
          this.encryption.decrypt(item.config),
        );
        console.log(
          `Attempting to send email via ${item.provider} with config:`,
          decryptedConfig,
        );
        const provider = this.providerFactory.getProvider(
          'EMAIL',
          item.provider,
          decryptedConfig,
        );

        await provider.send(to, subject, html);

        await this.logNotification('EMAIL', item.provider, to, 'SUCCESS');
        return true;
      } catch (err) {
        // 🔥 ADD THIS LOG TO SEE THE ACTUAL ERROR IN TERMINAL
        this.logger.error(
          `❌ Provider ${item.provider} execution failed: ${err.message}`,
          err.stack,
        );

        await this.logNotification(
          'EMAIL',
          item.provider,
          to,
          'FAILED',
          err.message,
        );
        continue;
      }
    }

    return false;
  }

  /**
   * Fetches providers from Cache or Database.
   */
  private async getActiveProviders() {
    this.logger.log('🔍 Fetching active email providers...');

    return await this.cacheService
      .getOrSet(
        this.CACHE_KEY,
        async () => {
          this.logger.log('📦 Cache MISS → Fetching providers from DB');

          const providers = await this.prisma.providerConfig.findMany({
            where: {
              type: 'EMAIL',
              isActive: true,
            },
            orderBy: { priority: 'asc' },
          });

          if (!providers.length) {
            this.logger.warn('⚠️ No active email providers found in DB');
          } else {
            this.logger.log(
              `✅ Found ${providers.length} active providers: ${providers
                .map((p) => `${p.provider}(priority:${p.priority})`)
                .join(', ')}`,
            );
          }

          return providers;
        },
        10,
      )
      .then((providers) => {
        this.logger.log('⚡ Providers loaded (from cache or DB)');

        providers.forEach((p, index) => {
          this.logger.log(
            `➡️ [${index + 1}] Provider: ${p.provider} | Priority: ${p.priority} | Active: ${p.isActive}`,
          );
        });

        return providers;
      });
  }

  /**
   * Logs notification attempts for auditing and debugging.
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
   * Manual cache invalidation (Call this when updating provider settings via Admin UI)
   */
  async invalidateProviderCache() {
    await this.cacheService.del(this.CACHE_KEY);
    this.logger.log('Email provider cache invalidated.');
  }
}
