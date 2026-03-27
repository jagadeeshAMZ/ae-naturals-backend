// src/providers/provider.factory.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PROVIDER_REGISTRY } from './provider.registry';

@Injectable()
export class ProviderFactory {

  getProvider(type: 'EMAIL' | 'SMS' | 'PAYMENT', providerName: string, config: any) {
    const providerMap = PROVIDER_REGISTRY[type];

    if (!providerMap) {
      throw new BadRequestException(`Invalid provider type: ${type}`);
    }

    const ProviderClass = providerMap[providerName.toUpperCase()];

    if (!ProviderClass) {
      throw new BadRequestException(`${type} Provider ${providerName} not found`);
    }

    return new ProviderClass(config); // ✅ PASS CONFIG HERE
  }
}