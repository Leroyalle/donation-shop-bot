import { Injectable } from '@nestjs/common';
import { Bot, Context, InlineKeyboard, session } from 'grammy';
import { startButtons } from '../constants/start-buttons.constants';
import { UserService } from 'src/domain/user/user.service';
import { InjectBot } from '@grammyjs/nestjs';
import { conversations, createConversation } from '@grammyjs/conversations';
import { PaymentConversationService } from './payment-conversation.service';

@Injectable()
export class TelegramService {
  constructor(
    private readonly userService: UserService,
    private readonly paymentConversationService: PaymentConversationService,
    @InjectBot() private readonly bot: Bot<Context>,
  ) {
    this.bot.use(session({ initial: () => ({}) }));

    this.bot.use(conversations());

    this.bot.use(
      createConversation(
        this.paymentConversationService.buyTopupConversation,
        'buy-topup',
      ),
    );
    this.bot.use(
      createConversation(
        this.paymentConversationService.steamPayConversation,
        'steam-pay',
      ),
    );

    this.bot.use(
      createConversation(
        this.paymentConversationService.cartCheckoutConversation,
        'cart-checkout',
      ),
    );
  }

  public async sendStartReply(ctx: Context) {
    try {
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
          reply_markup: {
            keyboard: [
              startButtons.map((b) => ({
                text: b.name,
                callback_data: b.callback_data,
              })),
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        },
      );
    } catch (error) {
      console.log('[START]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async handleCreateOrFindUser(ctx: Context) {
    try {
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
    } catch (error) {
      console.log('[handleCreateOrFindUser]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async showCategories(ctx: Context) {
    try {
      const keyboards = new InlineKeyboard([
        [{ text: 'Карты пополнения APP STORE', callback_data: 'catalog:0' }],
        [{ text: 'Пополнение Steam', callback_data: 'steam' }],
        [
          {
            text: 'Пополнение в играх',
            callback_data: 'additionalCategories',
          },
        ],
      ]);

      await ctx.reply('Выберите категорию услуг:', {
        reply_markup: keyboards,
      });
    } catch (error) {
      console.log('[showCategories]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }
}
