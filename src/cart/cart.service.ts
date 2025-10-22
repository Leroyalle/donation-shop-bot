import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CardService } from 'src/card/card.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepository: Repository<Cart>,
    private readonly cardService: CardService,
    private readonly cartItemService: CartItemService,
  ) {}

  async addToCart(cardId: string, user: User) {
    const findCard = await this.cardService.getById(cardId);

    if (!findCard) return;

    let cart = await this.cartRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
      relations: ['cartItems'],
    });

    if (!cart) {
      cart = await this.cartRepository.save({
        user,
        cartItems: [],
      });
    }

    let cartItem = await this.cartItemService.findOneByCardId(cardId, cart.id);
    console.log(cartItem);

    if (!cartItem) {
      cartItem = await this.cartItemService.create({
        card: findCard,
        cart,
        quantity: 1,
      });
      console.log('IN CCREATE', cartItem);
      cart.cartItems.push(cartItem);
    } else {
      await this.cartItemService.update(cartItem.id, {
        quantity: cartItem.quantity + 1,
      });
    }

    console.log('cart before create', cart);

    await this.cartRepository.save(cart);

    console.log('cart after push', cart);
  }

  async deleteFromCart(cartItemId: string) {
    const cartItem = await this.cartItemService.findOne(cartItemId);

    if (!cartItem) return;

    await this.cartItemService.remove(cartItemId);

    return cartItem;
  }

  async increment(cartItemId: string) {
    const cartItem = await this.cartItemService.findOne(cartItemId);
    if (!cartItem) return;

    await this.cartItemService.update(cartItemId, {
      quantity: cartItem.quantity + 1,
    });

    return this.cartItemService.findOne(cartItemId);
  }

  async decrement(cartItemId: string) {
    const cartItem = await this.cartItemService.findOne(cartItemId);

    if (!cartItem) return;

    if (cartItem.quantity > 1) {
      await this.cartItemService.update(cartItem.id, {
        quantity: cartItem.quantity - 1,
      });
    } else {
      await this.cartItemService.remove(cartItemId);
    }

    return this.cartItemService.findOne(cartItemId);
  }

  async getUserCart(userId: string) {
    return await this.cartRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: {
        cartItems: {
          card: true,
        },
      },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.getUserCart(userId);

    if (!cart) return;

    await this.cartItemService.deleteFromCart(cart.id);

    return await this.cartRepository.findOne({ where: { id: cart.id } });
  }
}
