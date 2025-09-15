import { Injectable } from '@nestjs/common';
import { InjectBot, Start, Update, CallbackQuery } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { CardService } from 'src/card/card.service';
import { UserService } from 'src/user/user.service';
import { CartService } from 'src/cart/cart.service';
import { Card } from 'src/card/entities/card.entity';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';

interface Product {
  id: number;
  name: string;
  price: string;
  description?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: '250 гемов',
    price: '100💎',
    description: '150 гемов в игре бс',
  },
  {
    id: 2,
    name: '700 гемов',
    price: '40💎',
    description: '700 гемов в бравл старс',
  },
];

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
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const cards = await this.cardService.getAll();

    if (cards.length === 0) {
      return await ctx.reply('Товаров пока нет!');
    }

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

      return await ctx.reply(`Товар ${product.name} добавлен в корзину`);
    } catch (e) {
      await ctx.reply('Произошла ошибка при добавлении товара');
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

      await ctx.deleteMessage();
      return await ctx.reply(
        `Товар ${deletedCartItem.card.name} удален из корзины`,
      );
    } catch (e) {
      await ctx.reply('Произошла ошибка при удалении товара');
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

    if (!cart) {
      return await ctx.reply('Корзина не найдена');
    }

    if (cart.cartItems.length === 0) {
      return ctx.reply('Корзина пуста');
    }

    for (const cartItem of cart.cartItems) {
      const { message, keyboards } = this.buildCartItemKeyboard(cartItem);

      return await ctx.replyWithPhoto(cartItem.card.imageUrl, {
        caption: message,
        reply_markup: keyboards,
        parse_mode: 'HTML',
      });
    }
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

      await ctx.editMessageReplyMarkup({ reply_markup: keyboards });
    } catch {
      await ctx.reply('Произошла ошибка при декременте элемента корзины');
    }
  }

  @CallbackQuery(/buy_\d+/)
  async onBuy(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    const id = parseInt(data!.split('_')[1], 10);
    const product = products.find((p) => p.id === id);

    if (!product) {
      return ctx.answerCallbackQuery({
        text: 'Product not found',
        show_alert: true,
      });
    }

    await ctx.answerCallbackQuery({ text: `You bought: ${product.name}! 🎉` });
    await ctx.editMessageText(
      `You bought: ${product.name} for ${product.price}`,
    );
  }

  buildCardCatalogKeyboard(card: Card) {
    const message = `<b>${card.name}</b>\n${card.description}`;

    const keyboards = new InlineKeyboard([
      [
        {
          text: `Купить - ${card.price}`,
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
