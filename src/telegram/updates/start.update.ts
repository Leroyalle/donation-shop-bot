import { InjectBot, Start, Update } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { TelegramService } from '../services/telegram.service';

@Update()
@Injectable()
export class StartUpdate {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
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

  @Start()
  async onStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await this.telegramService.handleCreateOrFindUser(ctx);
    await this.telegramService.sendStartReply(ctx);
  }
}
