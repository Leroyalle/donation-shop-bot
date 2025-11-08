import { Injectable } from '@nestjs/common';
import { Bot, Context, InlineKeyboard, session } from 'grammy';
import { startButtons } from '../constants/start-buttons.constants';
import { UserService } from 'src/user/user.service';
import { HttpClientService } from 'src/http-client/http-client.service';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/common/constants/api-paths';
import { AdditionalGroup } from 'src/common/types/additional-group.type';
import { TProductType } from 'src/common/types/product-type.type';
import { IProductById } from 'src/common/types/product-by-id.type';
import { InjectBot } from '@grammyjs/nestjs';
import { conversations, createConversation } from '@grammyjs/conversations';
import { User } from 'src/user/entities/user.entity';
import { PaymentConversationService } from 'src/payment/services/payment-conversation.service';

@Injectable()
export class TelegramService {
  constructor(
    private readonly userService: UserService,
    private readonly httpClientService: HttpClientService,
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
        [{ text: 'Основные товары', callback_data: 'catalog:0' }],
        [{ text: 'Пополнение Steam', callback_data: 'steam' }],
        [
          {
            text: 'Дополнительные товары',
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

  public async showAdditionalGroups(ctx: Context, group: string) {
    try {
      await ctx.answerCallbackQuery();

      const { data } =
        await this.httpClientService.payDigitalInstance.get<AdditionalGroup>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.getProductsByGroup,
          {
            params: {
              group,
            },
          },
        );
      console.log('ADDITIONAL,', data);

      const topups = data.forms?.topup_fields?.find(
        (f) => f.name === 'product_id',
      );

      if (!topups || !topups.options) {
        return await ctx.reply(`❌ К сожалению, товар ${group} отсутствует`);
      }

      const keyboard = new InlineKeyboard();
      keyboard.row({
        text: data.short_info,
        callback_data: `noop`,
      });

      topups.options.forEach((topup, i) => {
        if (i % 2 === 0) {
          keyboard.row();
        }

        keyboard.text(
          topup.product + ' - ' + topup.price + '₽',
          `topup:${topup.value}:${topup.type}`,
        );
      });

      await ctx.reply('Выбирите товар:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.log('[showAdditionalGroups]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async showAdditionalCategories(ctx: Context) {
    try {
      const { data } = await this.httpClientService.payDigitalInstance.get<
        AdditionalGroup[]
      >(PAY_DIGITAL_PAYMENT_ENDPOINTS.getGroups, {
        params: {
          category: 'games',
        },
      });

      const keyboard = new InlineKeyboard();

      data.forEach((group) => {
        if (group.category === 'games') {
          keyboard.text(group.group, `additional:${group.group}`).row();
        }
      });

      await ctx.reply('Выберите группу:', {
        reply_markup: keyboard,
      });

      // const categories: Set<string> = new Set();
      // data.forEach((group) => categories.add(group.category));

      // await ctx.reply('Выберите категорию:', {
      //   reply_markup: new InlineKeyboard(
      //     Array.from(categories).map((category) => [
      //       {
      //         text: category,
      //         callback_data: `additional:${category}`,
      //       },
      //     ]),
      //   ),
      // });
    } catch (error) {
      console.log('[showAdditionalCategories]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async showTopup(ctx: Context, id: string, type: TProductType) {
    try {
      const { data } =
        await this.httpClientService.payDigitalInstance.get<IProductById>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.getProduct,
          {
            params: {
              product_id: id,
              type,
            },
          },
        );

      if (!data) {
        return await ctx.reply('❌ Произошла ошибка');
      }

      if (!data.in_stock) {
        return await ctx.reply(`Товара ${data.name} нет в наличии`);
      }

      const keyboard = new InlineKeyboard();

      keyboard.row({
        text: 'Купить сейчас',
        callback_data: `additionalBuy:${id}:${type}`,
      });

      // await this.buyTopupConversation(ctx.conversation, ctx);

      return await ctx.reply(
        `🛍️ <b>Товар</b>\n\n<b>${data.name}</b>\n\n💰 <b><u>${data.price} ₽</u></b>`,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      console.log('[showTopup]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }

  public async handleAdditionalBuy(
    ctx: Context,
    id: string,
    type: TProductType,
    user: User,
  ) {
    try {
      await ctx.answerCallbackQuery();
      ctx.session.topupData = { productId: id };
      console.log('SESSION BEFORE', ctx.session);
      await ctx.conversation.enter('buy-topup', { user });

      console.log('after');
    } catch (error) {
      console.log('[handleAdditionalBuy]', error);
      await ctx.reply('❌ Произошла ошибка');
    }
  }
}
