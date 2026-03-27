// src/common/security/encryption.module.ts


import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [EncryptionService],
  exports: [EncryptionService], // Exporting makes it available to importing modules
})
export class EncryptionModule {}