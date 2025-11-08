import { CallbackQuery, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { CardService } from 'src/domain/card/card.service';
import { CartService } from 'src/domain/cart/cart.service';
import { TelegramService } from '../services/telegram.service';
import { TelegramCartService } from '../services/telegram-cart.service';

@Update()
@Injectable()
export class CartUpdate {
  constructor(
    private readonly cartService: CartService,
    private readonly cardService: CardService,
    private readonly telegramService: TelegramService,
    private readonly telegramCartService: TelegramCartService,
  ) {}

  @CallbackQuery(/^addToCart:/)
  async addToCart(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data) return;
      const id = data.split(':')[1];

      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const product = await this.cardService.getById(id);
      if (!product) return await ctx.reply('Продукт не найден');

      const user = await this.telegramService.handleCreateOrFindUser(ctx);

      if (!user) return;

      await this.cartService.addToCart(product.id, user);
      await ctx.answerCallbackQuery();
      await ctx.reply(`✅ Товар ${product.name} добавлен в корзину`);
    } catch (e) {
      await ctx.reply('❌ Произошла ошибка при добавлении товара');
      console.log(e);
    }
  }

  @CallbackQuery(/^deleteFromCart:/)
  async deleteFromCart(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data) return;
      const [_, id, page] = data.split(':');
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const user = await this.telegramService.handleCreateOrFindUser(ctx);

      if (!user) return;

      await this.cartService.deleteFromCart(id);
      await this.telegramCartService.showCartPage(ctx, Number(page));

      await ctx.answerCallbackQuery({
        text: '✅ Товар удален из корзины',
        show_alert: true,
      });
    } catch (e) {
      await ctx.reply('❌ Произошла ошибка при удалении товара');
      console.log(e);
    }
  }

  @CallbackQuery('cart')
  async getCart(ctx: Context) {
    await this.telegramCartService.showCartPage(ctx, 0);
  }

  @CallbackQuery(/^cartPage:/)
  async onCartPage(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const page = Number(data.split(':')[1]);
    if (isNaN(page)) return;

    await this.telegramCartService.showCartPage(ctx, page);
  }

  @CallbackQuery(/^increment:/)
  async increment(ctx: Context) {
    await this.telegramCartService.handleIncrement(ctx);
  }

  @CallbackQuery(/^decrement:/)
  async decrement(ctx: Context) {
    await this.telegramCartService.handleDecrement(ctx);
  }

  @CallbackQuery('checkout')
  async handleCheckout(ctx: Context) {
    // await ctx.reply('Введите email, на который отправить ссылку:');
    const user = await this.telegramService.handleCreateOrFindUser(ctx);
    if (!user) return;
    await ctx.conversation.enter('cart-checkout', { user });
    // ctx.session.cardEmail
  }
}
