// src/admin/store.controller.ts
import { Controller, Get, Post, Body, Patch, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { StoreService } from './store.service';

@Controller('admin/stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('admin:stores:all')
  @CacheTTL(3600)
  async findAll() {
    return this.storeService.findAll();
  }

  @Post()
  async create(@Body() createStoreDto: any) {
    // FIX: Call the service method instead of accessing prisma directly
    return this.storeService.createStore(createStoreDto);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }
}