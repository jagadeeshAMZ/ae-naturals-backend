// src/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsArray, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProductExtraDto {
  @IsOptional() @IsString() safetyInfo?: string;
  @IsOptional() @IsString() ingredients?: string;
  @IsOptional() @IsString() directions?: string;
  @IsOptional() @IsString() legalDisclaimer?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() countryOfOrigin?: string;
  @IsOptional() @IsString() weight?: string;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsString() genericName?: string;
  @IsOptional() @IsArray()  aPlusContent?: any[]; 
}


export class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() slug: string;
  @IsString() @IsNotEmpty() description: string;
  @IsNumber() price: number;
  @IsOptional() @IsNumber() oldPrice?: number;
  @IsString() category: string;
  @IsArray() @IsString({ each: true }) images: string[];
  @IsArray() @IsString({ each: true }) weights: string[];
  @IsString() ingredients: string;
  @IsArray() @IsString({ each: true }) careInstructions: string[];
  @IsArray() @IsString({ each: true }) deliveryInfo: string[];

  // NEW: Extra Content
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductExtraDto)
  extra?: ProductExtraDto;
}