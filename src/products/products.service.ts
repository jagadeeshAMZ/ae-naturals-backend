// src/products/products.service.ts
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { AppCacheService } from '../common/cache/cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cache: AppCacheService,
    private cloudinary: CloudinaryService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStoreCatalog(
    slug: string,
    categorySlug?: string,
    isAdmin: boolean = false,
  ) {
    const cacheKey = `catalog:${slug}:${categorySlug || 'all'}:${isAdmin}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const store = await this.prisma.store.findUnique({
          where: { slug },
          include: {
            products: {
              where: {
                ...(isAdmin ? {} : { isActive: true }),
                ...(categorySlug && { category: { slug: categorySlug } }),
              },
              include: {
                category: true,
                variants: true,
              },
            },
          },
        });

        if (!store) throw new NotFoundException(`Store ${slug} not found`);
        return store;
      },
      3600,
    );
  }

  async getProductBySlug(slug: string) {
    const cacheKey = `product:${slug}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        attributes: true, // Required for the Specs table
        variants: true, // Required for the Selection buttons
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    await this.cacheManager.set(cacheKey, product, 600000); // 10 mins
    return product;
  }

  async getSimilarProducts(categorySlug: string) {
    return this.prisma.product.findMany({
      where: {
        category: {
          slug: categorySlug,
        },
        isActive: true,
      },
      take: 4,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async createProduct(data: any) {
    // 1. Destructure to extract relational arrays and safety-check data
    // ADDED: variants to the destructuring list
    const {
      attributes = [],
      variants = [], // Added to handle the ProductVariant model
      careInstructions = [],
      deliveryInfo = [],
      ...rest
    } = data || {};

    // 2. Validation: Ensure required relations exist
    if (!rest.storeId) throw new BadRequestException('Store ID is required');
    if (!rest.categoryId)
      throw new BadRequestException('Category ID is required');

    // 3. Generate Slug if not provided (Safety fallback)
    const slug =
      rest.slug ||
      rest.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    try {
      return await this.prisma.product.create({
        data: {
          ...rest,
          slug,
          // Scalar lists (string arrays)
          careInstructions,
          deliveryInfo,

          // Handle Attributes relation (Nested Create)
          attributes: {
            create: attributes.map((attr: any) => ({
              name: attr.name,
              value: attr.value,
            })),
          },

          // ADDED: Handle Variants relation (Nested Create)
          // This maps the UI data to the ProductVariant model fields
          variants: {
            create: variants.map((v: any) => ({
              name: v.name,
              priceModifier: parseFloat(v.priceModifier || 0),
              stock: parseInt(v.stock || 0),
            })),
          },
        },
        include: {
          attributes: true,
          variants: true, // Include variants in the response
          category: true,
          store: true,
        },
      });
    } catch (error) {
      console.error('Prisma Create Error:', error);
      // Specific error check for unique constraints (like slug)
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A product with this name/slug already exists.',
        );
      }
      throw new BadRequestException(
        'Failed to create product. Please verify all fields.',
      );
    }
  }

  async invalidateCatalogCache(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (store) {
      await this.cacheManager.del(`catalog:${store.slug}`);
    }
  }
 async deleteProduct(id: string) {
  const startTime = Date.now();

  try {
    // 1. Fetch the product first to get the image URLs
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, images: true, storeId: true, name: true }
    });

    if (!product) {
      console.error(`[${id}] ❌ Delete failed: Product not found.`);
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 2. Background Cloudinary Cleanup
    if (product.images && product.images.length > 0) {
      
      // Fire and forget (non-blocking) to keep the API response fast
      Promise.all(
        product.images.map(async (url) => {
          const result = await this.cloudinary.deleteImage(url);
          return result;
        })
      ).catch(err => console.error(`[${id}] ⚠️ Background cleanup error:`, err.message));
    }

    // 3. Delete from Database
    const deletedProduct = await this.prisma.product.delete({
      where: { id },
    });

    // 4. Invalidate Cache
    await this.invalidateCatalogCache(deletedProduct.storeId);

    const duration = Date.now() - startTime;

    return deletedProduct;

  } catch (error) {
    console.error(`\n[${id}] 💥 FATAL ERROR during delete:`);
    console.error(error);
    
    if (error instanceof NotFoundException) throw error;
    
    throw new BadRequestException(
      'Failed to delete product. It might be linked to existing orders.',
    );
  }
}
  // src/admin/products.service.ts

  async updateProduct(id: string, data: any) {
    const startTime = Date.now();
  

    try {
      const {
        attributes = [],
        variants = [],
        images = [],
        ...rest
      } = data || {};

      // 1. Fetch current product
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        console.error(`[${id}] ❌ Product not found in database.`);
        throw new NotFoundException('Product not found');
      }

      // 2. Identify removed images
      const oldImages = existingProduct.images || [];
      const removedImages = oldImages.filter((img) => !images.includes(img));

     

      if (removedImages.length > 0) {
        

        // Background Cleanup (Non-blocking)
        Promise.all(
          removedImages.map(async (url) => {
            const result = await this.cloudinary.deleteImage(url);
            
            return result;
          }),
        )
          .then(() => {
            
          })
          .catch((err) => {
            console.error(
              `[${id}] ⚠️ Background cleanup encountered errors:`,
              err.message,
            );
          });
      } else {
        console.log(
          `[${id}] ✨ No images removed; skipping Cloudinary cleanup.`,
        );
      }

      // 3. Database Update
      // 3. Database Update
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          ...rest,
          images,
          attributes: {
            deleteMany: {}, // This wipes the old ones
            create: attributes
              .filter((a: any) => a.name && a.value)
              .map((a: any) => ({
                // DO NOT include 'id' or 'productId' here
                name: a.name,
                value: a.value,
              })),
          },
          variants: {
            deleteMany: {},
            create: variants
              .filter((v: any) => v.name)
              .map((v: any) => ({
                // DO NOT include 'id' or 'productId' here
                name: v.name,
                priceModifier: parseFloat(v.priceModifier || 0),
                stock: parseInt(v.stock || 0),
              })),
          },
        },
        include: { attributes: true, variants: true, category: true },
      });

      const duration = Date.now() - startTime;

      return updatedProduct;
    } catch (error) {
      console.error(`\n[${id}] 💥 FATAL ERROR during update:`);
      console.error(error);

      if (error instanceof NotFoundException) throw error;

      throw new BadRequestException(
        'Failed to update product and sync images.',
      );
    }
  }

  async getAllProducts() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        store: true,
        attributes: true, // <--- THIS WAS MISSING
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
