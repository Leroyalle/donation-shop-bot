import { Injectable } from '@nestjs/common';
import { InjectBot, Start, Update, CallbackQuery, On } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { CardService } from 'src/card/card.service';
import { UserService } from 'src/user/user.service';
import { CartService } from 'src/cart/cart.service';
import { CartItemService } from 'src/cart-item/cart-item.service';
import { PaymentService } from 'src/payment/payment.service';
import { TelegramService } from './telegram.service';

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
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Запуск бота' },
      { command: 'catalog', description: 'Посмотреть каталог товаров' },
      { command: 'cart', description: 'Корзина' },
      { command: 'orders', description: 'Мои заказы' },
    ]);
    console.log('Bot commands set!');
  }

  @Start()
  async onStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await this.handleCreateOrFindUser(ctx);
    await this.telegramService.sendStartReply(ctx);
  }

  @CallbackQuery(/^catalog:/)
  async getCatalog(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    console.log(data);
    if (!data) return;
    const page = Number(data.split(':')[1]);
    if (isNaN(page)) return;
    await ctx.answerCallbackQuery();
    await this.telegramService.showCatalogPage(ctx, page);
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

      const user = await this.handleCreateOrFindUser(ctx);

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

      const user = await this.handleCreateOrFindUser(ctx);

      if (!user) return;

      await this.cartService.deleteFromCart(id);
      await this.showCartPage(ctx, Number(page));

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
    const { message, keyboards } = this.telegramService.buildCartItemKeyboard(
      cartItems[0],
      page,
      totalPages,
      amount,
    );

    await ctx.answerCallbackQuery();
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
      await this.showCartPage(ctx, page);
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
    const user = await this.handleCreateOrFindUser(ctx);
    if (!user) return;

    const cart = await this.cartService.getUserCart(user.id);
    await ctx.answerCallbackQuery();

    if (!cart || cart.cartItems.length === 0)
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

  private async handleCreateOrFindUser(ctx: Context) {
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

  @On('message')
  async onTextMessage(ctx: Context) {
    const text = ctx.message?.text;
    if (!text) return;
    if (text === '🏠') {
      await this.telegramService.sendStartReply(ctx);
    }
    if (text === '📂') {
      await this.telegramService.showCatalogPage(ctx, 0, false);
    }
    if (text === '🧺') {
      await this.showCartPage(ctx, 0);
    }
  }
}
