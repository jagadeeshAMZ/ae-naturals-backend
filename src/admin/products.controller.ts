// src/admin/products.controller.ts
import { Controller, Put, Post, Delete, Body, Param, UseGuards, Req, BadRequestException, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/products')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminProductsController {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService
  ) {}

@Get()
  async getAll() {
    return this.productsService.getAllProducts();
  }
@Post()
async create(@Body() createProductDto: any) {
  // 1. Validation
  if (!createProductDto.name || !createProductDto.price) {
    throw new BadRequestException('Product name and price are required');
  }

  // 2. Execute Creation and capture the result
  const result = await this.productsService.createProduct(createProductDto);

  // 3. Cache Invalidation (Uses storeId from the newly created product)
  // We use result.storeId because it's guaranteed to exist after creation
  if (result?.storeId) {
    await this.productsService.invalidateCatalogCache(result.storeId);
  }

  // 4. Finally return the created product to the frontend
  return result;
}

 
@Put(':id') // or @Put(':id')
async updateProduct(
  @Param('id') id: string, 
  @Body() data: any // <--- Ensure @Body() is here and not empty
) {
  // Defensive check to prevent the crash
  if (!data) {
    throw new BadRequestException('Payload is required');
  }

  return this.productsService.updateProduct(id, data);
}

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}