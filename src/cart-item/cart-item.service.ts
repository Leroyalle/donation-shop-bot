import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CartItemService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async create(createCartItemDto: Omit<CartItem, 'id'>) {
    return await this.cartItemRepository.save(createCartItemDto);
  }

  async findOneByCardId(cardId: string, cartId: string) {
    return await this.cartItemRepository.findOne({
      where: {
        card: { id: cardId },
        cart: { id: cartId },
      },
    });
  }

  async findOne(id: string) {
    return await this.cartItemRepository.findOne({ where: { id } });
  }

  async update(id: string, updateCartItemDto: Partial<Omit<CartItem, 'id'>>) {
    try {
      return await this.cartItemRepository.update(id, updateCartItemDto);
    } catch (error) {
      console.log(error);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} cartItem`;
  }
}
