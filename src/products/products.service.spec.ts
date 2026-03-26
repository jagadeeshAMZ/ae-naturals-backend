import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: { product: { findMany: jest.fn() } } },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return cached data if available', async () => {
    mockCache.get.mockResolvedValue([{ id: '1', name: 'Cached Flower' }]);
    const result = await service.getStoreCatalog('store_123');
    expect(result).toHaveLength(1);
    expect(mockCache.get).toHaveBeenCalledWith('store:store_123:products');
  });
});