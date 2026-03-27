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

        const provider = this.providerFactory.getProvider(
          'EMAIL',
          item.provider,
          decryptedConfig,
        );

        await provider.send(to, subject, html);

        await this.logNotification('EMAIL', item.provider, to, 'SUCCESS');
        return true;
      } catch (err) {
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
    return await this.cacheService.getOrSet(
      this.CACHE_KEY,
      async () => {
        return await this.prisma.providerConfig.findMany({
          where: {
            type: 'EMAIL',
            isActive: true, // STRICT CHECK: Only fetches active providers
          },
          orderBy: { priority: 'asc' },
        });
      },
      300, // Cache for 5 minutes for high performance
    );
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
