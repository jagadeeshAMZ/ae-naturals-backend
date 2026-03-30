// src\admin\dto\create-product.dto.ts
import { IsString, IsNumber, IsArray, IsOptional, IsNotEmpty, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class ProductExtraDto {
  @ApiPropertyOptional({ example: 'Keep away from children' })
  @IsOptional() @IsString() safetyInfo?: string;

  @ApiPropertyOptional({ example: 'Aloe Vera, Neem extract' })
  @IsOptional() @IsString() ingredients?: string;

  @ApiPropertyOptional({ example: 'Apply twice daily on clean skin' })
  @IsOptional() @IsString() directions?: string;

  @ApiPropertyOptional({ example: 'Not evaluated by FDA' })
  @IsOptional() @IsString() legalDisclaimer?: string;

  @ApiPropertyOptional({ example: 'AE Naturals Pvt Ltd' })
  @IsOptional() @IsString() manufacturer?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional() @IsString() countryOfOrigin?: string;

  @ApiPropertyOptional({ example: '250g' })
  @IsOptional() @IsString() weight?: string;

  @ApiPropertyOptional({ example: '10x5x5 cm' })
  @IsOptional() @IsString() dimensions?: string;

  @ApiPropertyOptional({ example: 'Herbal Face Wash' })
  @IsOptional() @IsString() genericName?: string;

  @ApiPropertyOptional({ 
    description: 'Array of A+ Content blocks (Banner, Split, Grid, Text)',
    example: [
      { type: 'BANNER', content: { imageUrl: 'https://...', overlayTitle: 'Premium Quality' } },
      { type: 'TEXT', content: { title: 'Why Choose Us?', description: '<p>Organic ingredients...</p>' } }
    ]
  })
  @IsOptional() @IsArray() aPlusContent?: any[]; 
}

export class ProductAttributeDto {
  @ApiProperty({ example: 'Size' })
  @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ example: '500ml' })
  @IsString() @IsNotEmpty() value: string;
}

export class ProductVariantDto {
  @ApiProperty({ example: 'Pack of 2' })
  @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ example: 150, description: 'Amount added to base price' })
  @IsNumber() priceModifier: number;

  @ApiProperty({ example: 50, description: 'Inventory stock for this variant' })
  @IsNumber() stock: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Organic Aloe Vera Gel' })
  @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ example: 'organic-aloe-vera-gel' })
  @IsString() @IsNotEmpty() slug: string;

  @ApiPropertyOptional({ example: '100% pure organic aloe vera gel for glowing skin.' })
  @IsOptional() @IsString() description?: string;
  
  @ApiProperty({ example: 299.00 })
  @IsNumber() price: number;

  @ApiPropertyOptional({ example: 399.00 })
  @IsOptional() @IsNumber() oldPrice?: number | null;
  
  @ApiProperty({ example: 'cmn8v1xic0002y8tytq7apepe' })
  @IsString() @IsNotEmpty() categoryId: string;

  @ApiProperty({ example: 'cmn8v1xi00001y8tyu1cv43s6' })
  @IsString() @IsNotEmpty() storeId: string;
  
  @ApiProperty({ example: ['https://res.cloudinary.com/.../img1.jpg'] })
  @IsArray() @IsString({ each: true }) images: string[];
  
  @ApiPropertyOptional({ example: 'Aloe Vera Extract, Vitamin E' })
  @IsOptional() @IsString() ingredients?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ example: ['Store in a cool dry place'] })
  @IsOptional() @IsArray() @IsString({ each: true }) careInstructions?: string[];

  @ApiPropertyOptional({ example: ['Ships in 24 hours', 'Free delivery over ₹500'] })
  @IsOptional() @IsArray() @IsString({ each: true }) deliveryInfo?: string[];

  @ApiPropertyOptional({ type: () => [ProductAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @ApiPropertyOptional({ type: () => [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ type: () => ProductExtraDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductExtraDto)
  extra?: ProductExtraDto;
}

// Automatically creates an Update DTO with all fields marked as Optional for Swagger!
export class UpdateProductDto extends PartialType(CreateProductDto) {}