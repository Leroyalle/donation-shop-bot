import { Injectable } from '@nestjs/common';
import { InjectBot, Start, Update, CallbackQuery } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { CardService } from 'src/card/card.service';
import { UserService } from 'src/user/user.service';
import { CartService } from 'src/cart/cart.service';
import { Card } from 'src/card/entities/card.entity';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { PaymentService } from 'src/payment/payment.service';

const startButtons = [
  {
    name: 'Каталог',
    callback_data: 'catalog',
  },
  { name: 'Заказы', callback_data: 'orders' },
  { name: 'Корзина', callback_data: 'cart' },
];

@Update()
@Injectable()
export class TelegramController {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly cardService: CardService,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly cartItemService: CartItemService,
    private readonly paymentService: PaymentService,
  ) {}

  @Start()
  async onStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;

    if (!telegramId) return;

    await this.userService.createOrFindUser({
      telegramId,
      name: firstName,
      username,
      cart: null,
      orders: [],
    });

    await ctx.reply(
      `Добро пожаловать в BRO STARS SHOP! 
У нас вы можете пополнить баланс в APP STORE и оплатить любую программу в app store, продлить подписку или использовать средства для покупки в играх! 

 💯 ЛЕГАЛЬНЫЙ ДОНАТ В МОБИЛЬНЫЕ ИГРЫ И ПОДПИСКИ В ПРИЛОЖЕНИЯХ
 💯 ОФИЦИАЛЬНЫЕ КАРТЫ ПОПОЛНЕНИЯ
 💯 СНИМАЕТ ВСЕ ОГРАНИЧЕНИЯ ДЛЯ РОССИЙСКИХ АККАУНТОВ 
 💯 МОМЕНТАЛЬНАЯ ДОСТАВКА`,
      {
        reply_markup: new InlineKeyboard([
          startButtons.map((b) => ({
            text: b.name,
            callback_data: b.callback_data,
          })),
        ]),
      },
    );
  }

  @CallbackQuery('catalog')
  async getCatalog(ctx: Context) {
    // stop Telegram loading animation for callback button

    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const cards = await this.cardService.getAll();

    if (cards.length === 0) {
      return await ctx.reply('Товаров пока нет!');
    }

    await ctx.answerCallbackQuery();

    for (const card of cards) {
      const { message, keyboards } = this.buildCardCatalogKeyboard(card);
      return await ctx.replyWithPhoto(card.imageUrl, {
        caption: message,
        reply_markup: keyboards,
        parse_mode: 'HTML',
      });
    }
  }

  @CallbackQuery(/^addToCart:/)
  async addToCart(ctx: Context) {
    try {
      console.log('add to cart init');
      const data = ctx.callbackQuery?.data;
      const id = data!.split(':')[1];
      const telegramId = ctx.from?.id;

      if (!telegramId) return;

      const product = await this.cardService.getById(id);

      if (!product) {
        return await ctx.reply('Продукт не найден');
      }

      const user = await this.userService.findByTgId(telegramId);

      if (!user) return;

      console.log('after add to cart');

      await this.cartService.addToCart(product.id, user);

      await ctx.answerCallbackQuery();

      return await ctx.reply(`✅ Товар ${product.name} добавлен в корзину`);
    } catch (e) {
      await ctx.reply('❌ Произошла ошибка при добавлении товара');
      console.log(e);
    }
  }
  @CallbackQuery(/^deleteFromCart:/)
  async deleteFromCart(ctx: Context) {
    try {
      console.log('add to cart init');
      const data = ctx.callbackQuery?.data;
      const id = data!.split(':')[1];
      const telegramId = ctx.from?.id;

      if (!telegramId) return;

      const user = await this.userService.findByTgId(telegramId);

      if (!user) return;

      console.log('after add to cart');

      const deletedCartItem = await this.cartService.deleteFromCart(id);

      console.log(deletedCartItem);

      if (!deletedCartItem) return;

      await ctx.answerCallbackQuery();

      await ctx.deleteMessage();
      return await ctx.reply(
        `✅ Товар ${deletedCartItem.card.name} удален из корзины`,
      );
    } catch (e) {
      await ctx.reply('❌ Произошла ошибка при удалении товара');
      console.log(e);
    }
  }

  @CallbackQuery('cart')
  async getCart(ctx: Context) {
    const telegramId = ctx.from?.id;

    if (!telegramId) return;

    const user = await this.userService.findByTgId(telegramId);

    if (!user) return;

    const cart = await this.cartService.getUserCart(user.id);

    await ctx.answerCallbackQuery();

    if (!cart) {
      return await ctx.reply('Корзина не найдена');
    }

    if (cart.cartItems.length === 0) {
      return await ctx.reply('Вы еще не добавили ни одного товара 🪹');
    }

    for (const cartItem of cart.cartItems) {
      const { message, keyboards } = this.buildCartItemKeyboard(cartItem);

      await ctx.replyWithPhoto(cartItem.card.imageUrl, {
        caption: message,
        reply_markup: keyboards,
        parse_mode: 'HTML',
      });
    }
    return await ctx.reply('Оплатить корзину:', {
      reply_markup: new InlineKeyboard([
        [{ text: 'Перейти к оформлению', callback_data: 'buy' }],
      ]),
    });
  }

  @CallbackQuery(/^increment:/)
  async increment(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      const cartItemId = data!.split(':')[1];
      const telegramId = ctx.from?.id;

      if (!telegramId) return;

      const user = await this.userService.findByTgId(telegramId);

      if (!user) return;

      const updatedCartItem = await this.cartService.increment(cartItemId);

      if (!updatedCartItem) return;

      const { keyboards } = this.buildCartItemKeyboard(updatedCartItem);

      await ctx.answerCallbackQuery();

      await ctx.editMessageReplyMarkup({ reply_markup: keyboards });
    } catch {
      await ctx.reply('Произошла ошибка при инкременте товара');
    }
  }

  @CallbackQuery(/^decrement:/)
  async decrement(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      const cartItemId = data!.split(':')[1];
      const telegramId = ctx.from?.id;

      if (!telegramId) return;

      const user = await this.userService.findByTgId(telegramId);

      if (!user) return;

      const updatedCartItem = await this.cartService.decrement(cartItemId);

      if (!updatedCartItem) return;

      const { keyboards } = this.buildCartItemKeyboard(updatedCartItem);

      await ctx.answerCallbackQuery();

      await ctx.editMessageReplyMarkup({ reply_markup: keyboards });
    } catch {
      await ctx.reply('Произошла ошибка при декременте элемента корзины');
    }
  }

  @CallbackQuery('noop')
  async noop(ctx: Context) {
    await ctx.answerCallbackQuery();
  }

  @CallbackQuery('buy')
  async onClickBuy(ctx: Context) {
    const telegramId = ctx.from?.id;

    if (!telegramId) return;

    const user = await this.userService.findByTgId(telegramId);

    if (!user) return;

    const cart = await this.cartService.getUserCart(user.id);

    await ctx.answerCallbackQuery();

    if (!cart) {
      return ctx.answerCallbackQuery({
        text: 'Корзина пуста',
        show_alert: true,
      });
    }

    const paymentUrl = await this.paymentService.createPayment(cart, user);

    if (!paymentUrl)
      return await ctx.reply('Не удалось создать платеж. Попробуйте еще раз');

    await ctx.reply('Оплатить заказ по ссылке:', {
      reply_markup: new InlineKeyboard([
        [{ text: 'Оплатить', url: paymentUrl }],
      ]),
    });
  }

  buildCardCatalogKeyboard(card: Card) {
    const message = `<b>${card.name}</b>\n${card.description}`;

    const keyboards = new InlineKeyboard([
      [
        {
          text: `Добавить в корзину - ${card.price}`,
          callback_data: `addToCart:${card.id}`,
        },
      ],
    ]);

    return { message, keyboards };
  }

  buildCartItemKeyboard(cartItem: CartItem) {
    const message = `<b>${cartItem.card.name}</b>\n${cartItem.card.description}`;

    const keyboards = new InlineKeyboard([
      [
        {
          text: cartItem.quantity + 'шт',
          callback_data: 'noop',
        },
      ],
      [
        {
          text: `+`,
          callback_data: `increment:${cartItem.id}`,
        },
        {
          text: `Удалить`,
          callback_data: `deleteFromCart:${cartItem.id}`,
        },
        {
          text: `-`,
          callback_data: `decrement:${cartItem.id}`,
        },
      ],
    ]);

    return { message, keyboards };
  }
}
