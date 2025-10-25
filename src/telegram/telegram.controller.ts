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
  { name: 'Каталог', callback_data: 'catalog' },
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

  async onModuleInit() {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Запуск бота' },
      { command: 'catalog', description: 'Посмотреть каталог товаров' },
      { command: 'cart', description: 'Корзина' },
      { command: 'orders', description: 'Мои заказы' },
      { command: 'help', description: 'Помощь / контакты' },
    ]);
    console.log('Bot commands set!');
  }

  @Start()
  async onStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;

    await this.userService.createOrFindUser({
      telegramId,
      name: firstName,
      username,
      cart: null,
      orders: [],
    });

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
  }

  @CallbackQuery('catalog')
  async getCatalog(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const cards = await this.cardService.getAll();
    if (cards.length === 0) return await ctx.reply('Товаров пока нет!');

    await ctx.answerCallbackQuery();

    for (const card of cards) {
      const { message, keyboards } = this.buildCardCatalogKeyboard(card);
      await ctx.replyWithPhoto(card.imageUrl, {
        caption: message,
        reply_markup: keyboards,
        parse_mode: 'HTML',
      });
    }
  }

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

      const user = await this.userService.findByTgId(telegramId);
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
      const id = data.split(':')[1];
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const user = await this.userService.findByTgId(telegramId);
      if (!user) return;

      const deletedCartItem = await this.cartService.deleteFromCart(id);
      if (!deletedCartItem) return;

      await ctx.answerCallbackQuery();
      await ctx.deleteMessage();
      await ctx.reply(
        `✅ Товар ${deletedCartItem.card.name} удален из корзины`,
      );
    } catch (e) {
      await ctx.reply('❌ Произошла ошибка при удалении товара');
      console.log(e);
    }
  }

  @CallbackQuery('cart')
  async getCart(ctx: Context) {
    await this.showCartPage(ctx, 0);
  }

  @CallbackQuery(/^cartPage:/)
  async onCartPage(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const page = Number(data.split(':')[1]);
    if (isNaN(page)) return;

    await this.showCartPage(ctx, page);
  }

  private async showCartPage(ctx: Context, page: number) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.userService.findByTgId(telegramId);
    if (!user) return;

    await ctx.answerCallbackQuery();

    // Здесь предполагается метод с пагинацией в БД
    const pageSize = 5;
    const { cartItems, totalItems } =
      await this.cartItemService.getUserCartPage(user.id, page, pageSize);

    if (!cartItems || cartItems.length === 0) {
      return await ctx.reply('Вы еще не добавили ни одного товара 🪹');
    }

    const totalPages = Math.ceil(totalItems / pageSize);

    const keyboard = new InlineKeyboard();

    cartItems.forEach((cartItem) => {
      keyboard
        .text(`${cartItem.card.name} x${cartItem.quantity}`, 'noop')
        .row()
        .text('+', `increment:${cartItem.id}:${page}`)
        .text('Удалить', `deleteFromCart:${cartItem.id}`)
        .text('-', `decrement:${cartItem.id}:${page}`)
        .row();
    });

    const navKeyboard: { text: string; callback_data: string }[] = [];
    if (page > 0)
      navKeyboard.push({ text: '←', callback_data: `cartPage:${page - 1}` });
    navKeyboard.push({
      text: `${page + 1}/${totalPages}`,
      callback_data: 'noop',
    });
    if (page < totalPages - 1)
      navKeyboard.push({ text: '→', callback_data: `cartPage:${page + 1}` });
    keyboard.row(...navKeyboard);

    console.log('after reply');

    await ctx.reply('Корзина:', { reply_markup: keyboard });
  }

  @CallbackQuery(/^increment:/)
  async increment(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data) return;
      const [_, cartItemId, pageStr] = data.split(':');
      const page = Number(pageStr) || 0;
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      await this.cartService.increment(cartItemId);

      await this.showCartPage(ctx, page);
      await ctx.deleteMessage();
    } catch {
      await ctx.reply('Произошла ошибка при инкременте товара');
    }
  }

  @CallbackQuery(/^decrement:/)
  async decrement(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data) return;
      const [_, cartItemId, pageStr] = data.split(':');
      const page = Number(pageStr) || 0;
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      await this.cartService.decrement(cartItemId);

      console.log('After show cart page', cartItemId, page);
      await this.showCartPage(ctx, page);
      await ctx.deleteMessage();
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

    if (!cart)
      return ctx.answerCallbackQuery({
        text: 'Корзина пуста',
        show_alert: true,
      });

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
    const keyboards = new InlineKeyboard().text(
      `Добавить в корзину - ${card.price}`,
      `addToCart:${card.id}`,
    );
    return { message, keyboards };
  }

  buildCartItemKeyboard(cartItem: CartItem) {
    const message = `<b>${cartItem.card.name}</b>\n${cartItem.card.description}`;
    const keyboards = new InlineKeyboard()
      .text(`${cartItem.quantity} шт`, 'noop')
      .row()
      .text('+', `increment:${cartItem.id}`)
      .text('Удалить', `deleteFromCart:${cartItem.id}`)
      .text('-', `decrement:${cartItem.id}`);
    return { message, keyboards };
  }
}
