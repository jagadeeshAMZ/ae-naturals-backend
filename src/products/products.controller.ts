import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // src/products/products.controller.ts
  @Get('catalog/:storeSlug')
  async getStoreCatalog(
    @Param('storeSlug') storeSlug: string,
    @Query('category') categorySlug?: string, // Allow optional category filtering
  ) {
    return this.productsService.getStoreCatalog(storeSlug, categorySlug);
  }


  @Get()
  async findAll(@Query('category') category?: string) {
    
    // 1. Fetch the catalog (cast as 'any' or your Store interface to access properties)
    const catalog = (await this.productsService.getStoreCatalog(
      'flower-fairy-dehradun',
    )) as any;

    // 2. Safely access products from the cached store object
    if (!catalog || !catalog.products) {
      console.warn('No catalog or products found for store: flower-fairy-dehradun');
      return [];
    }

    if (category) {
      return catalog.products.filter((p: any) => p.category?.slug === category);
    }

    return catalog.products;
  }


@Get(':slug') // This specifically catches GET /api/v1/products/amal-sanders
async findOne(@Param('slug') slug: string) {
  const product = await this.productsService.getProductBySlug(slug);
  if (!product) {
    throw new NotFoundException(`Product with slug ${slug} not found`);
  }
  return product;
}

@Get('similar/:category')
  async findSimilar(@Param('category') category: string) {
    return this.productsService.getSimilarProducts(category);
  }
}
