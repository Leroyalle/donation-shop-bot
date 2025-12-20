import { Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { Conversation } from '@grammyjs/conversations';
import { User } from 'src/domain/user/entities/user.entity';
import {
  PAY_DIGITAL_PAYMENT_ENDPOINTS,
  PAY_DIGITAL_PAYMENT_URL,
} from 'src/shared/constants/api-paths';
import { PaymentService } from 'src/domain/payment/services/payment.service';
import { TSteamCheckResult } from 'src/shared/types/steam/steam-check-result.type';
import { ITopupCheckRequest } from 'src/interfaces/telegram/services/payment-conversation/types/topup-check-request.type';
import { TTopupCheckResponse } from 'src/interfaces/telegram/services/payment-conversation/types/topup-check-response.type';
import { TSteamPayResult } from '../../../../shared/types/steam/steam-pay-result.type';
import { ISteamPayRequest } from '../../../../shared/types/steam/steam-pay-request.type';
import { increasePriceByPercent } from 'src/shared/lib/increase-price-by-percent.lib';
import { AdditionalGroup, Field } from 'src/shared/types/additional-group.type';
import { getOptionText } from './lib/get-option-text';
import { additionalTypeTranslater } from './constants/additiomal-type-translater';
import { TProductType } from 'src/shared/types/product-type.type';
import { ConfigService } from '@nestjs/config';
import { ConversationHelpersService } from './conversation-helpers.service';
import { validateEmail } from './lib/validate-email.lib';
import { Cart } from 'src/domain/cart/entities/cart.entity';
import { ProductType } from 'src/domain/product/types/product-type.enum';

@Injectable()
export class PaymentConversationService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly httpClientService: HttpClientService,
    private readonly configService: ConfigService,
    private readonly conversationHelpersService: ConversationHelpersService,
  ) {}

  public cartCheckoutConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user, cart }: { user: User; cart: Cart },
  ) => {
    try {
      await this.conversationHelpersService.cancelNotification(ctx);
      await ctx.reply('Введите вашу электронную почту:');
      const email =
        await this.conversationHelpersService.waitForText(conversation);

      if (!validateEmail(email)) {
        await ctx.reply('❌ Некорректный e-mail. Попробуйте ещё раз.');
        return;
      }

      let tgUsername: string | undefined;
      if (cart.cartItems.some((item) => item.card.type === ProductType.STARS)) {
        await ctx.reply(
          'Введите телеграм Username (@) на который отправить звезды:',
        );
        tgUsername =
          await this.conversationHelpersService.waitForText(conversation);
        tgUsername.replace(/^@/, '').trim();
        if (tgUsername.length > 20 || tgUsername.length < 3) {
          await ctx.reply('❌ Никнейм должен быть от 3 до 20 символов.');
          return;
        }
      }

      await this.paymentService.paymentHandler(ctx, user, email, tgUsername);
    } catch (error) {
      console.log('[CART_CHECKOUT_CONV]', error);
      if (error.message === 'Conversation cancelled') return;
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  public steamPayConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      await this.conversationHelpersService.cancelNotification(ctx);

      while (true) {
        await ctx.reply('Напишите имя вашего аккаунта STEAM:');

        const nickname =
          await this.conversationHelpersService.waitForText(conversation);

        if (nickname.length > 20 || nickname.length <= 1) {
          await ctx.reply('❌ Никнейм должен быть от 2 до 20 символов.');
          continue;
        }

        await ctx.reply('Повторите введённое ранее имя:');
        const repeatNick =
          await this.conversationHelpersService.waitForText(conversation);

        if (!nickname || !repeatNick || nickname !== repeatNick) {
          await ctx.reply('❌ Никнеймы не совпадают, попробуем ещё раз.');
          continue;
        }

        await ctx.reply('Введите сумму пополнения в рублях:');
        const amount =
          await this.conversationHelpersService.waitForText(conversation);
        const parsedAmount = parseInt(amount || '', 10);

        if (
          !amount ||
          isNaN(parsedAmount) ||
          parsedAmount <= 4 ||
          parsedAmount > 100000
        ) {
          await ctx.reply(
            '❌ Число должно быть больше 4 и меньше 100000. Диалог перезапускается.',
          );
          continue;
        }

        await ctx.reply(
          'К оплате: ' +
            increasePriceByPercent(parsedAmount) +
            ' руб. Оформить?',
          {
            reply_markup: new Keyboard()
              .text('Да')
              .text('Закрыть диалог')
              .resized()
              .oneTime(),
          },
        );

        const confirm =
          await this.conversationHelpersService.waitForText(conversation);

        if (confirm !== 'Да') {
          await ctx.reply('❌ Диалог отменён.');
          throw new Error('Conversation cancelled');
        }

        await ctx.reply(`⌛ Поиск и проверка аккаунта...`);

        const { data: checkResult } =
          await this.httpClientService.payDigitalInstance.post<TSteamCheckResult>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.steamCheck,
            { steamUsername: nickname },
          );

        if (checkResult.status === 'error') {
          return await ctx.reply(`❌ Произошла ошибка. ${checkResult.message}`);
        }

        await ctx.reply('✅ Аккаунт найден! Создание оплаты...');

        const order = await conversation.external(async () => {
          return await this.orderService.create({
            user,
            amount: increasePriceByPercent(parsedAmount),
            paymentId: null,
            status: 'NEW',
            email: null,
            cart: null,
            items: '',
            type: 'STEAM',
          });
        });

        const payData: ISteamPayRequest = {
          transactionId: checkResult.transactionId,
          netAmount: parsedAmount,
          amount: increasePriceByPercent(parsedAmount),
          currency: 'RUB',
          directSuccess: false,
          orderId: order.id,
          steamUsername: nickname,
        };

        const { data: payResult } =
          await this.httpClientService.payDigitalInstance.post<TSteamPayResult>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.steamPay,
            payData,
          );

        if (payResult?.status === 'error') {
          return await ctx.reply(`❌ Произошла ошибка. ${payResult.message}`);
        }

        await conversation.external(async () => {
          await this.orderService.update(order.id, {
            paymentId: payResult.sbpTransactionUuid,
          });
        });

        await ctx.reply('Все готово! Осталось оплатить заказ 👇', {
          reply_markup: new InlineKeyboard([
            [{ text: 'Оплатить', url: payResult.payUrl }],
          ]),
        });
        break;
      }
    } catch (error) {
      if (error.message === 'Conversation cancelled') return;
      console.log('[STEAM_PAY_CONV]', error);
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  public buyAdditionalTopupConversation = async (
    conversation: Conversation,
    ctx: Context,
    { data, user }: { data: AdditionalGroup; user: User },
  ) => {
    try {
      if (!data.forms) return await ctx.reply('❌ Произошла ошибка');

      const donateTypeKeyboard = new Keyboard();

      (
        Object.entries(data.forms) as [keyof typeof data.forms, Field[]][]
      ).forEach(([key], i) => {
        if (i % 2 === 0) {
          donateTypeKeyboard.row();
        }
        donateTypeKeyboard
          .text(additionalTypeTranslater[key])
          .resized()
          .oneTime();
      });

      await this.conversationHelpersService.cancelNotification(ctx);

      await ctx.reply('Выберите тип товара:', {
        reply_markup: donateTypeKeyboard.resized().oneTime(),
      });

      const typeAnswer =
        await this.conversationHelpersService.waitForText(conversation);

      let groupFields: Field[] | undefined;
      let groupType: TProductType | undefined;
      if (typeAnswer === additionalTypeTranslater['topup_fields']) {
        groupFields = data.forms?.topup_fields;
        groupType = 'TOPUP';
      } else if (typeAnswer === additionalTypeTranslater['voucher_fields']) {
        groupFields = data.forms?.voucher_fields;
        groupType = 'VOUCHER';
      } else {
        return await ctx.reply('❌ Произошла ошибка');
      }

      const goods = groupFields?.find((f) => f.name === 'product_id');

      if (!goods || !goods.options) {
        return await ctx.reply(
          `❌ К сожалению, товар ${data.group} отсутствует`,
        );
      }

      const productKeyboard = new Keyboard();

      goods.options.forEach((article, i) => {
        if (!article.price) return;

        if (i % 2 === 0) {
          productKeyboard.row();
        }

        productKeyboard
          .text(
            article.product +
              ' - ' +
              increasePriceByPercent(article.price) +
              '₽',
          )
          .resized()
          .oneTime();
      });

      await ctx.reply(`Выберите конкретный товар ${data.group}:`, {
        reply_markup: productKeyboard,
      });

      const articleAnswer =
        await this.conversationHelpersService.waitForText(conversation);

      const selectedProduct = goods.options.find(
        (o) =>
          o.product + ' - ' + increasePriceByPercent(o.price) + '₽' ===
          articleAnswer,
      );

      if (!selectedProduct) {
        await ctx.reply('❌ Пожалуйста, выберите товар из списка.');
        throw new Error('Conversation cancelled');
      }

      const dataResult: Record<string, string> = {};

      for (const f of groupFields) {
        if (f.name === 'product_id') continue;
        if (!f.options) {
          await ctx.reply('Введите ' + f.label + ':');
          dataResult[f.name] =
            await this.conversationHelpersService.waitForText(conversation);
          continue;
        } else {
          const keyboard = new Keyboard();
          f.options.forEach((o) => {
            const text = getOptionText(o);

            keyboard.text(text).resized().oneTime();
          });
          await ctx.reply('Выберите из списка ' + f.label + ':', {
            reply_markup: keyboard,
          });

          const answer =
            await this.conversationHelpersService.waitForText(conversation);
          const selectedOption = f.options.find((o) => {
            const text = getOptionText(o);
            return text === answer;
          });
          if (!selectedOption) {
            await ctx.reply('❌ Пожалуйста, выберите из списка.');
            throw new Error('Conversation cancelled');
          }
          dataResult[f.name] = String(selectedOption.value);

          continue;
        }
      }

      const summary = Object.entries(dataResult)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      await ctx.reply(`✅${summary}\n\nВсе верно?`, {
        reply_markup: new Keyboard()
          .text('Да')
          .text('Прервать')
          .resized()
          .oneTime(),
      });

      const confirmText =
        await this.conversationHelpersService.waitForText(conversation);
      if (confirmText.toLowerCase() !== 'да') {
        return await ctx.reply('❌ Диалог отменён.');
        // session.topupData = null;
      }

      await ctx.reply('⌛ Поиск и проверка аккаунта...');

      const donateReqData: ITopupCheckRequest = {
        ...dataResult,
        retail_price: increasePriceByPercent(selectedProduct.price),
        product_id: selectedProduct.value,
      };

      let resData: TTopupCheckResponse | undefined;

      if (groupType === 'VOUCHER') {
        const { data: res } =
          await this.httpClientService.payDigitalInstance.post<TTopupCheckResponse>(
            PAY_DIGITAL_PAYMENT_URL.v1,
            {
              path: '/voucher/buy',
              request: donateReqData,
            },
            {
              headers: {
                Authorization: `Bearer ${this.configService.get('PAYDIGITAL_VOUCHER')}`,
                'X-Partner-ID':
                  this.configService.get<string>('PAYDIGITAL_STEAM')!,
              },
            },
          );
        resData = res;
      }
      if (groupType === 'TOPUP') {
        const { data: res } =
          await this.httpClientService.payDigitalInstance.post<TTopupCheckResponse>(
            PAY_DIGITAL_PAYMENT_ENDPOINTS.topupCheck,
            donateReqData,
          );
        resData = res;
      }

      if (!resData) return await ctx.reply('❌ Произошла ошибка');

      if (!resData.status) {
        return await ctx.reply(`❌ Произошла ошибка: ${resData.comment}`);
      }

      await conversation.external(async () => {
        await this.orderService.create({
          type: groupType,
          status: 'NEW',
          amount: resData.retail_price_rub,
          email: null,
          paymentId: resData.sbp_uuid,
          user,
          items: '',
          cart: null,
        });
      });

      const paymentKeyboard = new InlineKeyboard();
      paymentKeyboard.url(`Оплатить`, resData.sbp_url);
      await ctx.reply(`Ссылка на оплату ${resData.product} 👇:`, {
        reply_markup: paymentKeyboard,
      });
    } catch (error) {
      console.log('[BUY_ADDITIONAL_TOPUP]', error);
      if (error?.message === 'Conversation cancelled') return;
      if (!error?.response?.data?.status) {
        return await ctx.reply(
          `❌ Произошла ошибка: ${error.response.data.comment}`,
        );
      }
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };
}
