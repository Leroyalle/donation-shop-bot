import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { CartService } from 'src/cart/cart.service';
import { TelegramService } from './telegram.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { UiBuilderService } from './ui-builder.service';

@Injectable()
export class TelegramCartService {
  constructor(
    private readonly cartService: CartService,
    private readonly cartItemService: CartItemService,
    private readonly telegramService: TelegramService,
    private readonly uiBuilderService: UiBuilderService,
  ) {}

  public async showCartPage(
    ctx: Context,
    page: number,
    editable: boolean = true,
  ) {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const user = await this.telegramService.handleCreateOrFindUser(ctx);

      if (!user) return;

      const pageSize = 1;
      const { cartItems, totalItems } =
        await this.cartItemService.getUserCartPage(user.id, page, pageSize);
      const cart = await this.cartService.getUserCart(user.id);

      if (!cartItems || cartItems.length === 0 || !cart) {
        return await ctx.reply('Вы еще не добавили ни одного товара 🪹');
      }
      const amount = cart.cartItems.reduce(
        (acc, item) => acc + item.card.price * item.quantity,
        0,
      );
      const totalPages = Math.ceil(totalItems / pageSize);
      const { message, keyboards } =
        this.uiBuilderService.buildCartItemKeyboard(
          cartItems[0],
          page,
          totalPages,
          amount,
        );

      // await ctx.answerCallbackQuery();
      if (editable) {
        await ctx.editMessageMedia(
          {
            type: 'photo',
            media: cartItems[0].card.imageUrl,
            caption: message,
            parse_mode: 'HTML',
          },
          {
            reply_markup: keyboards,
          },
        );
      } else {
        await ctx.replyWithPhoto(cartItems[0].card.imageUrl, {
          caption: message,
          parse_mode: 'HTML',
          reply_markup: keyboards,
        });
      }
    } catch (error) {
      console.log('[showCartPage]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async handleIncrement(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data) return;
      const [_, cartItemId, pageStr] = data.split(':');
      const page = Number(pageStr) || 0;
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      await this.cartService.increment(cartItemId);
      await this.showCartPage(ctx, page);
    } catch (error) {
      console.log('[handleIncrement]', error);
      await ctx.reply('Произошла ошибка при инкременте товара');
    }
  }

  public async handleDecrement(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data) return;
      const [_, cartItemId, pageStr] = data.split(':');
      const page = Number(pageStr) || 0;
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      await this.cartService.decrement(cartItemId);
      await this.showCartPage(ctx, page);
    } catch (error) {
      console.log('[handleDecrement]', error);
      await ctx.reply('Произошла ошибка при декременте элемента корзины');
    }
  }
}
