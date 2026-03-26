// src/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

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
}