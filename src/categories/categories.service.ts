import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });
  }

  async create(data: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({ where: { slug: data.slug } });
    if (exists) throw new ConflictException('Category slug already exists');
    
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (e) {
      throw new ConflictException('Cannot delete category with associated products');
    }
  }
}