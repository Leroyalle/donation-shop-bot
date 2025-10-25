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

  async create(createCartItemDto: Omit<CartItem, 'id' | 'createdAt'>) {
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
    return await this.cartItemRepository.findOne({
      where: { id },
      relations: {
        card: true,
        cart: true,
      },
    });
  }

  async update(id: string, updateCartItemDto: Partial<Omit<CartItem, 'id'>>) {
    try {
      return await this.cartItemRepository.update(id, updateCartItemDto);
    } catch (error) {
      console.log(error);
    }
  }

  async remove(id: string) {
    return await this.cartItemRepository.delete(id);
  }

  async deleteFromCart(cartId: string) {
    await this.cartItemRepository.delete({ cart: { id: cartId } });
  }

  async findAllByCart(cartId: string) {
    return await this.cartItemRepository.find({
      where: { cart: { id: cartId } },
      relations: { card: true },
    });
  }

  async getUserCartPage(userId: string, page: number, pageSize: number) {
    const [cartItems, totalItems] = await this.cartItemRepository.findAndCount({
      where: {
        cart: {
          user: { id: userId },
        },
      },
      relations: ['card', 'cart'],
      skip: page * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
    });

    return { cartItems, totalItems };
  }
}
