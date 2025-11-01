import { Injectable } from '@nestjs/common';
import { InjectBot, Start, Update, CallbackQuery, On } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { CardService } from 'src/card/card.service';
import { CartService } from 'src/cart/cart.service';
import { TelegramService } from './telegram.service';
import {
  StartButton,
  startButtonNames,
} from './constants/start-buttons.constants';
import { TProductType } from 'src/common/types/product-type.type';
import { createConversation } from '@grammyjs/conversations';

@Update()
@Injectable()
export class TelegramUpdate {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly cardService: CardService,
    private readonly cartService: CartService,
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Запуск бота' },
      { command: 'categories', description: 'Посмотреть каталог товаров' },
      { command: 'cart', description: 'Корзина' },
      { command: 'orders', description: 'Мои заказы' },
    ]);

    console.log('Bot commands set!');
  }

  // @CallbackQuery('start')
  // async handleStartCallback(ctx: Context) {
  // }

  // @On('message')
  // async handleUpdate(ctx: Context) {
  //   if (ctx.message?.text === '/start') {
  //     await ctx.reply('Начинаем диалог!');
  //     await ctx.conversation.enter('greeting');
  //   }
  // }

  @Start()
  async onStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await this.telegramService.handleCreateOrFindUser(ctx);
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

  @CallbackQuery('additionalCategories')
  async getAdditionalCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.telegramService.showAdditionalCategories(ctx);
  }

  @CallbackQuery(/^additionalBuy:/)
  async handleAdditionalBuy(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, id, type] = data.split(':');
    await this.telegramService.handleAdditionalBuy(
      ctx,
      id,
      type as TProductType,
    );
  }

  @CallbackQuery(/^additional:/)
  async getAdditionalServices(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, group] = data.split(':');
    await this.telegramService.showAdditionalGroups(ctx, group);
  }

  @CallbackQuery(/^topup:/)
  async getTopup(ctx: Context) {
    await ctx.answerCallbackQuery();
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [_, productId, type] = data.split(':');
    if (!productId || !type) {
      return await ctx.reply('❌ Произошла ошибка');
    }
    await this.telegramService.showTopup(ctx, productId, type as TProductType);
  }

  @CallbackQuery('categories')
  async getCategories(ctx: Context) {
    await ctx.answerCallbackQuery();
    await this.telegramService.showCategories(ctx);
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
      await this.telegramService.showCartPage(ctx, Number(page));

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
    await this.telegramService.showCartPage(ctx, 0);
  }

  @CallbackQuery(/^cartPage:/)
  async onCartPage(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const page = Number(data.split(':')[1]);
    if (isNaN(page)) return;

    await this.telegramService.showCartPage(ctx, page);
  }

  @CallbackQuery(/^increment:/)
  async increment(ctx: Context) {
    await this.telegramService.handleIncrement(ctx);
  }

  @CallbackQuery(/^decrement:/)
  async decrement(ctx: Context) {
    await this.telegramService.handleDecrement(ctx);
  }

  @CallbackQuery('noop')
  async noop(ctx: Context) {
    await ctx.answerCallbackQuery();
  }

  // @CallbackQuery('buy')
  // async onClickBuy(ctx: Context) {
  //   const telegramId = ctx.from?.id;
  //   if (!telegramId) return;
  //   await this.telegramService.paymentHandler(ctx);
  // }

  @CallbackQuery('checkout')
  async handleCheckout(ctx: Context) {
    await ctx.reply('Введите email, на который отправить ссылку:');
    // ctx.session.waitingForEmail = true;
  }

  @On('message:text')
  async onTextMessage(ctx: Context) {
    const text = ctx.message?.text;
    if (!text) return;

    // if (ctx.session?.waitingForEmail && ctx.session.email) {
    //   const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

    //   if (!valid) {
    //     await ctx.reply('Неверный формат email. Попробуй ещё раз:');
    //     return;
    //   }

    //   ctx.session.waitingForEmail = false;
    //   ctx.session.email = text;
    //   await this.telegramService.paymentHandler(ctx, ctx.session.email);
    //   return;
    // }

    if (!startButtonNames.has(text as StartButton)) return;

    const actionsMap: Record<StartButton, () => Promise<void>> = {
      '🛍️ Наши услуги': async () => {
        await this.telegramService.showCategories(ctx);
      },
      '🧾 Заказы': async () => {
        await ctx.reply('Вот ваши заказы');
      },
      '🧺 Корзина': async () => {
        await this.telegramService.showCartPage(ctx, 0, false);
      },
      '🏠 Начало': async () => {
        await this.telegramService.sendStartReply(ctx);
      },
    };

    if (actionsMap[text]) {
      await actionsMap[text]();
    }

    // if (text === 'Начало') {
    //   await this.telegramService.sendStartReply(ctx);
    // }
    // if (text === '📂') {
    //   await this.telegramService.showCatalogPage(ctx, 0, false);
    // }
    // if (text === '🧺') {
    //   await this.telegramService.showCartPage(ctx, 0, false);
    // }
  }
}
