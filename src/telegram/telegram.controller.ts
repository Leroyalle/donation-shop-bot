import { Injectable } from '@nestjs/common';
import { InjectBot, Start, Update, CallbackQuery } from '@grammyjs/nestjs';
import { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { CardService } from 'src/card/card.service';

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
  ) {}

  @Start()
  async onStart(ctx: Context) {
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
    console.log('[callback_query] catalog');
    const cards = await this.cardService.getAll();

    if (cards.length === 0) {
      return await ctx.reply('Товаров пока нет!');
    }

    for (const card of cards) {
      const message = `<b>${card.name}</b>\n${card.description}`;

      const keyboards = new InlineKeyboard([
        [
          {
            text: `Купить - ${card.price}`,
            callback_data: `addToCart:${card.id}`,
          },
        ],
      ]);

      return await ctx.replyWithPhoto(card.imageUrl, {
        caption: message,
        reply_markup: keyboards,
        parse_mode: 'HTML',
      });
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
}
