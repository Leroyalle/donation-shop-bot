import { Injectable } from '@nestjs/common';
import { InjectBot, Update, CallbackQuery, On, Start } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { TelegramCoreService } from '../services/telegram-core.service';
import {
  StartButton,
  startButtonNames,
} from '../constants/start-buttons.constants';
import { TelegramCartService } from '../services/telegram-cart.service';
import { SupportService } from '../services/support.service';

@Update()
@Injectable()
export class TelegramCoreUpdate {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly telegramService: TelegramCoreService,
    private readonly telegramCartService: TelegramCartService,
    private readonly supportService: SupportService,
  ) {}
  async onModuleInit() {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Запуск бота' },
      { command: 'categories', description: 'Посмотреть каталог товаров' },
      { command: 'cart', description: 'Корзина' },
      {
        command: 'support',
        description: 'Помощь',
      },
      // { command: 'orders', description: 'Мои заказы' },
    ]);

    console.log('Bot commands set!');
  }

  @Start()
  async onStart(ctx: Context) {
    console.log('start update triggered');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await this.telegramService.handleCreateOrFindUser(ctx);
    await this.telegramService.sendStartReply(ctx);
  }

  @CallbackQuery('noop')
  async noop(ctx: Context) {
    await ctx.answerCallbackQuery();
  }

  @On('message:text')
  async onTextMessage(ctx: Context) {
    console.log(ctx.chat?.id);
    if (ctx.chat?.type !== 'private') return;

    const text = ctx.message?.text;
    if (!text) return;

    if (!startButtonNames.has(text as StartButton)) return;

    const actionsMap: Record<StartButton, () => Promise<void>> = {
      '🛍️ Наши услуги': async () => {
        await this.telegramService.showCategories(ctx);
      },
      // '🧾 Заказы': async () => {
      //   await ctx.reply('Вот ваши заказы');
      // },
      '🧺 Корзина': async () => {
        await this.telegramCartService.showCartPage(ctx, 0, false);
      },
      '🏠 Начало': async () => {
        await this.telegramService.sendStartReply(ctx);
      },
      '❓ Помощь': async () => {
        await this.supportService.sendSupportReply(ctx);
      },
    };

    if (actionsMap[text]) {
      await actionsMap[text]();
    }
  }
}
