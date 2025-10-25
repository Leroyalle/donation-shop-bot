import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { startButtons } from './constants/start-buttons.constants';

@Injectable()
export class TelegramService {
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

    await ctx.reply('Привет! Выбери действие:', {
      reply_markup: {
        keyboard: [['🏠'], ['📂'], ['🧺']],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }
}
