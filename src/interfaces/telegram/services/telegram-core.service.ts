import { Injectable } from '@nestjs/common';
import { Bot, Context, InlineKeyboard, session } from 'grammy';
import { startButtons } from '../constants/start-buttons.constants';
import { UserService } from 'src/domain/user/user.service';
import { InjectBot } from '@grammyjs/nestjs';
import { conversations, createConversation } from '@grammyjs/conversations';
import { PaymentConversationService } from './payment-conversation/payment-conversation.service';
import { UserSource } from 'src/shared/types/user/user-sourse.enum';
import { ProductType } from 'src/domain/product/types/product-type.enum';
import { KeysPaymentConversationsService } from './payment-conversation/keys-payment-conversations.service';
import { GameConversationService } from './payment-conversation/game-conversation.service';

@Injectable()
export class TelegramCoreService {
  constructor(
    private readonly userService: UserService,
    private readonly paymentConversationService: PaymentConversationService,
    private readonly gameConversationService: GameConversationService,
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly keysPaymentConversationsService: KeysPaymentConversationsService,
  ) {
    this.bot.use(session({ initial: () => ({}) }));

    this.bot.use(conversations());

    this.bot.use(
      createConversation(
        this.paymentConversationService.buyAdditionalTopupConversation,
        'buy-additional',
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
        this.gameConversationService.buyGameConversation,
        'buy_steam_game',
      ),
    );

    this.bot.use(
      createConversation(
        this.paymentConversationService.cartCheckoutConversation,
        'cart-checkout',
      ),
    );
    this.bot.use(
      createConversation(
        this.keysPaymentConversationsService.buyKeyConversation,
        'buy_key',
      ),
    );
    this.bot.use(
      createConversation(
        this.keysPaymentConversationsService.extendKeyConversation,
        'extend_key',
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
        source: UserSource.TELEGRAM,
      });
    } catch (error) {
      console.log('[handleCreateOrFindUser]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async showCategories(ctx: Context) {
    try {
      const keyboards = new InlineKeyboard([
        [
          {
            text: '⭐ Telegram Stars',
            callback_data: `catalog:0:${ProductType.STARS}:${undefined}:false`,
          },
        ],
        [
          {
            text: '🔑 Ключи',
            callback_data: `keys`,
          },
        ],
        [
          {
            text: '🍎 App Store — карты пополнения',
            callback_data: 'apple_cards',
          },
        ],
        [{ text: '🎮 Steam — пополнение', callback_data: 'steam' }],
        [
          {
            text: '🕹️ Пополнение в играх',
            callback_data: 'additionalCategories',
          },
        ],
        [
          {
            text: '🧩 Игры Steam',
            callback_data: 'show_steam_games',
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
