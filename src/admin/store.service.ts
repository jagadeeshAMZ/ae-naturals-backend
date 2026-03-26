// src/admin/store.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    const cacheKey = 'admin:stores:all';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const stores = await this.prisma.store.findMany();
    await this.cacheManager.set(cacheKey, stores, 3600000); // 1 hour
    return stores;
  }

  async findBySlug(slug: string) {
    const cacheKey = `store:slug:${slug}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const store = await this.prisma.store.findUnique({ 
      where: { slug },
      include: { products: true } 
    });
    
    if (!store) throw new NotFoundException(`Store ${slug} not found`);
    
    await this.cacheManager.set(cacheKey, store, 600000); 
    return store;
  }

  async updateStore(id: string, data: any) {
    const store = await this.prisma.store.update({ where: { id }, data });
    
    // Invalidate specific cache keys
    await this.cacheManager.del('admin:stores:all');
    await this.cacheManager.del(`store:slug:${store.slug}`);
    
    return store;
  }
  // Add this method to fix the first error
  async clearListCache() {
    await this.cacheManager.del('admin:stores:all');
  }
  // Ensure create logic is in the service instead of the controller
  async createStore(data: any) {
    const store = await this.prisma.store.create({ data });
    await this.clearListCache();
    return store;
  }
}