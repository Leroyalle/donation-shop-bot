import { Injectable } from '@nestjs/common';
import { OrderService } from 'src/domain/order/order.service';
import { HttpClientService } from 'src/infrastructure/http-client/http-client.service';
import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { Conversation } from '@grammyjs/conversations';
import { User } from 'src/domain/user/entities/user.entity';
import { PAY_DIGITAL_PAYMENT_ENDPOINTS } from 'src/shared/constants/api-paths';
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

@Injectable()
export class PaymentConversationService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly httpClientService: HttpClientService,
  ) {}

  public cartCheckoutConversation = async (
    conversation: Conversation,
    ctx: Context,
    { user }: { user: User },
  ) => {
    try {
      await ctx.reply(
        '‼️ Вы можете прервать диалог в любой момент, отправив /cancel.',
      );
      await ctx.reply('Введите email, на который отправить ссылку:');
      const email = await this.waitForText(conversation);
      if (!email) return await ctx.reply('Попробуйте ещё раз');
      await this.paymentService.paymentHandler(ctx, user, email);
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
      await ctx.reply(
        '‼️ Вы можете прервать диалог в любой момент, отправив /cancel.',
      );

      while (true) {
        await ctx.reply('Напишите имя вашего аккаунта STEAM:');

        const nickname = await this.waitForText(conversation);

        await ctx.reply('Повторите введённое ранее имя:');
        const repeatNick = await this.waitForText(conversation);

        if (!nickname || !repeatNick || nickname !== repeatNick) {
          await ctx.reply('Никнеймы не совпадают, попробуем ещё раз.');
          continue;
        }

        await ctx.reply('Введите сумму пополнения в рублях:');
        const amount = await this.waitForText(conversation);
        const parsedAmount = parseInt(amount || '', 10);

        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
          await ctx.reply(
            '❌ Введите корректное число больше 0. Диалог перезапускается.',
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

        const confirm = await this.waitForText(conversation);

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
      console.log('[STEAM_PAY_CONV]', error);
      if (error.message === 'Conversation cancelled') return;
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };

  private async waitForText(conversation: Conversation) {
    const msgCtx = await conversation.waitFor('message:text');
    const text = msgCtx.message.text.trim();

    if (text?.toLowerCase() === '/cancel' || text?.toLowerCase() === 'отмена') {
      await msgCtx.reply('❌ Диалог отменён.');
      throw new Error('Conversation cancelled');
    }

    return text;
  }

  public buyAdditionalTopupConversation = async (
    conversation: Conversation,
    ctx: Context,
    { data, user }: { data: AdditionalGroup; user: User },
  ) => {
    try {
      if (!data.forms) return await ctx.reply('❌ Произошла ошибка');

      console.log('after !data.forms');
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

      await ctx.reply(
        '‼️ Вы можете прервать диалог в любой момент, отправив /cancel.',
      );

      await ctx.reply('Выберите тип товара:', {
        reply_markup: donateTypeKeyboard.resized().oneTime(),
      });

      console.log('after entries');

      const typeAnswer = await this.waitForText(conversation);

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

      const articleAnswer = await this.waitForText(conversation);

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
          dataResult[f.name] = await this.waitForText(conversation);
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

          const answer = await this.waitForText(conversation);
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

      const confirmText = await this.waitForText(conversation);
      if (confirmText.toLowerCase() !== 'да') {
        return await ctx.reply('❌ Диалог отменён.');
        // session.topupData = null;
      }

      const donateReqData: ITopupCheckRequest = {
        ...dataResult,
        retail_price: increasePriceByPercent(selectedProduct.price),
        product_id: selectedProduct.value,
      };

      console.log('topupReqData', donateReqData);

      const reqUrl =
        groupType === 'TOPUP'
          ? PAY_DIGITAL_PAYMENT_ENDPOINTS.topupCheck
          : PAY_DIGITAL_PAYMENT_ENDPOINTS.voucherBuy;

      const { data: res } =
        await this.httpClientService.payDigitalInstance.post<TTopupCheckResponse>(
          reqUrl,
          donateReqData,
        );

      if (!res.status) {
        return await ctx.reply(`❌ Произошла ошибка: ${res.comment}`);
      }

      console.log('RES', res);

      await conversation.external(async () => {
        await this.orderService.create({
          type: groupType,
          status: 'NEW',
          amount: res.retail_price_rub,
          email: null,
          paymentId: res.sbp_uuid,
          user,
          items: '',
          cart: null,
        });
      });

      const paymentKeyboard = new InlineKeyboard();
      paymentKeyboard.url(`${res.product} - Перейти к оплате 👇`, res.sbp_url);
      await ctx.reply(`Ссылка на оплату ${res.product}:`, {
        reply_markup: paymentKeyboard,
      });
    } catch (error) {
      console.log('[BUY_ADDITIONAL_TOPUP]', error);
      if (error.message === 'Conversation cancelled') return;
      if (!error.response.data.status) {
        return await ctx.reply(
          `❌ Произошла ошибка: ${error.response.data.comment}`,
        );
      }
      await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
    }
  };
}
