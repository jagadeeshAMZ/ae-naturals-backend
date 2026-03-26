// src/cart/cart.controller.ts
import { 
  Controller, Get, Post, Delete, Body, Req, Param, UseGuards, Logger, UnauthorizedException, 
  Patch
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';

// src/cart/cart.controller.ts
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async add(@Req() req, @Body() dto: { productId: string; quantity: number }) {
    console.log('Add to cart request:', { userId: req.user.userId, ...dto });
    return this.cartService.addToCart(req.user.userId, dto.productId, dto.quantity);
  }

  @Get()
  async getCart(@Req() req) {
    return this.cartService.getCart(req.user.userId);
  }

  @Patch('update')
  async update(@Req() req, @Body() dto: { productId: string; quantity: number }) {
    return this.cartService.updateQuantity(req.user.userId, dto.productId, dto.quantity);
  }

  @Delete('remove/:productId')
  async remove(@Req() req, @Param('productId') pid: string) {
    return this.cartService.removeItem(req.user.userId, pid);
  }

  @Delete('clear')
  async clear(@Req() req) {
    return this.cartService.clearCart(req.user.userId);
  }
}