import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { startButtons } from './constants/start-buttons.constants';
import { CardService } from 'src/card/card.service';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { Card } from 'src/card/entities/card.entity';
import { CartService } from 'src/cart/cart.service';
import { UserService } from 'src/user/user.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class TelegramService {
  constructor(
    private readonly cardService: CardService,
    private readonly cartService: CartService,
    private readonly userService: UserService,
    private readonly cartItemService: CartItemService,
    private readonly paymentService: PaymentService,
  ) {}

  public async sendStartReply(ctx: Context) {
    await ctx.reply(
      `<b>👋 Добро пожаловать в BRO STARS SHOP!</b>\n
    Здесь вы можете:
    • Пополнить баланс в <b>App Store</b>
    • Оплатить любую подписку или приложение
    • Использовать средства для покупок в играх\n
    <b>Почему выбирают нас:</b>
    💎 100% легальный донат  
    💳 Официальные карты пополнения  
    🌍 Работает с российскими аккаунтами  
    ⚡ Моментальная доставка\n
    Выберите раздел ниже, чтобы начать 👇`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard([
          startButtons.map((b) => ({
            text: b.name,
            callback_data: b.callback_data,
          })),
        ]),
      },
    );

    // await ctx.reply('Вы так же можете воспользоваться меню ниже:', {
    //   reply_markup: {
    //     keyboard: [['🏠', '📂', '🧺']],
    //     resize_keyboard: true,
    //     one_time_keyboard: false,
    //   },
    // });
  }

  public async showCatalogPage(
    ctx: Context,
    page: number,
    editable: boolean = true,
  ) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const perPage = 1;
    const [cards, totalItems] = await this.cardService.getByPage(page, perPage);
    console.log(cards);
    if (cards.length === 0)
      return await ctx.reply('Товаров пока нет! Попробуйте позже');

    const { message, keyboards } = this.buildCardCatalogKeyboard(
      cards[0],
      page,
      totalItems,
      perPage,
    );

    if (editable) {
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: cards[0].imageUrl,
          caption: message,
          parse_mode: 'HTML',
        },
        {
          reply_markup: keyboards,
        },
      );
    } else {
      await ctx.replyWithPhoto(cards[0].imageUrl, {
        caption: message,
        parse_mode: 'HTML',
        reply_markup: keyboards,
      });
    }
  }

  public buildCardCatalogKeyboard(
    card: Card,
    page: number,
    totalItems: number,
    perPage: number = 1,
  ) {
    const message = `<b>${card.name}</b>\n${card.description}`;
    const keyboards = new InlineKeyboard().row({
      text: `Добавить в корзину - ${card.price} ₽`,
      callback_data: `addToCart:${card.id}:${page}`,
    });

    const totalPages = Math.ceil(totalItems / perPage);

    const navKeyboard: { text: string; callback_data: string }[] = [];
    if (page > 0) {
      navKeyboard.push({ text: '←', callback_data: `catalog:${page - 1}` });
    }
    navKeyboard.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: 'noop',
    });
    if (page < totalPages - 1) {
      navKeyboard.push({ text: '→', callback_data: `catalog:${page + 1}` });
    }
    keyboards.row(...navKeyboard);
    return { message, keyboards };
  }

  public buildCartItemKeyboard(
    cartItem: CartItem,
    page: number,
    totalPages: number,
    amount: number,
  ) {
    const message = `<b>${cartItem.card.name}</b>\n${cartItem.card.description}`;
    const keyboards = new InlineKeyboard()
      .text(
        `${cartItem.quantity} шт - ${cartItem.card.price * cartItem.quantity} ₽`,
        'noop',
      )
      .row()
      .text('+', `increment:${cartItem.id}:${page}`)
      .text('Удалить', `deleteFromCart:${cartItem.id}:${page}`)
      .text('-', `decrement:${cartItem.id}:${page}`)
      .row()
      .text(`✅ Заказ на ${amount} ₽ Оформить?`, 'checkout')
      .row()
      .text('🛒 Продолжить покупки', 'catalog:0');

    const navKeyboard: { text: string; callback_data: string }[] = [];
    if (page > 0)
      navKeyboard.push({ text: '←', callback_data: `cartPage:${page - 1}` });
    navKeyboard.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: 'noop',
    });
    if (page < totalPages - 1)
      navKeyboard.push({ text: '→', callback_data: `cartPage:${page + 1}` });
    keyboards.row(...navKeyboard);

    console.log('after reply');

    return { message, keyboards };
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
    } catch {
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
    } catch {
      await ctx.reply('Произошла ошибка при декременте элемента корзины');
    }
  }

  public async showCartPage(
    ctx: Context,
    page: number,
    editable: boolean = true,
  ) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.handleCreateOrFindUser(ctx);

    if (!user) return;

    const pageSize = 1;
    const { cartItems, totalItems } =
      await this.cartItemService.getUserCartPage(user.id, page, pageSize);
    const cart = await this.cartService.getUserCart(user.id);

    if (!cartItems || cartItems.length === 0 || !cart) {
      await ctx.answerCallbackQuery();
      return await ctx.reply('Вы еще не добавили ни одного товара 🪹');
    }
    const amount = cart.cartItems.reduce(
      (acc, item) => acc + item.card.price * item.quantity,
      0,
    );
    const totalPages = Math.ceil(totalItems / pageSize);
    const { message, keyboards } = this.buildCartItemKeyboard(
      cartItems[0],
      page,
      totalPages,
      amount,
    );

    await ctx.answerCallbackQuery();
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
  }

  public async handleCreateOrFindUser(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;

    return await this.userService.createOrFindUser({
      telegramId,
      name: firstName,
      username,
      cart: null,
      orders: [],
    });
  }

  public async paymentHandler(ctx: Context, email: string) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const user = await this.handleCreateOrFindUser(ctx);
    if (!user) return;

    const cart = await this.cartService.getUserCart(user.id);
    await ctx.answerCallbackQuery();

    if (!cart || cart.cartItems.length === 0)
      return ctx.answerCallbackQuery({
        text: 'Корзина пуста',
        show_alert: true,
      });

    const paymentUrl = await this.paymentService.createCkassaPayment(
      cart,
      user,
      email,
    );
    if (!paymentUrl)
      return await ctx.reply('Не удалось создать платеж. Попробуйте еще раз');

    await ctx.reply('Оплатить заказ по ссылке:', {
      reply_markup: new InlineKeyboard([
        [{ text: 'Оплатить', url: paymentUrl }],
      ]),
    });
  }

  public async showCategories(ctx: Context) {
    const keyboards = new InlineKeyboard([
      [{ text: 'Все товары', callback_data: 'catalog:0' }],
      [{ text: 'Пополнение Steam', callback_data: 'steam' }],
      [{ text: 'Дополнительные товары', callback_data: 'additional' }],
    ]);

    await ctx.reply('Выберите категорию услуг:', {
      reply_markup: keyboards,
    });
  }
}
