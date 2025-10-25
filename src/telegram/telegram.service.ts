import { Injectable } from '@nestjs/common';
import { Context, InlineKeyboard } from 'grammy';
import { startButtons } from './constants/start-buttons.constants';
import { CardService } from 'src/card/card.service';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { Card } from 'src/card/entities/card.entity';

@Injectable()
export class TelegramService {
  constructor(private readonly cardService: CardService) {}

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

  public async showCatalogPage(ctx: Context, page: number) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const perPage = 1;
    const [cards, totalItems] = await this.cardService.getByPage(page, perPage);
    console.log(cards);
    if (cards.length === 0)
      return await ctx.reply('Товаров пока нет! Попробуйте позже');

    await ctx.answerCallbackQuery();
    const { message, keyboards } = this.buildCardCatalogKeyboard(
      cards[0],
      page,
      totalItems,
      perPage,
    );
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
      .text(`✅ Заказ на ${amount} ₽ Оформить?`, 'buy')
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
}
