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
import { AdditionalGroup } from 'src/shared/types/additional-group.type';
import { getOptionText } from './lib/get-option-text';

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

  // public buyTopupConversation = async (
  //   conversation: Conversation,
  //   ctx: Context,
  //   { user }: { user: User },
  // ) => {
  //   try {
  //       await ctx.reply(
  //   '‼️ Вы можете прервать диалог в любой момент, отправив /cancel.',
  // );
  //     const session = await conversation.external((ctx) => ctx.session);
  //     await ctx.reply('Введите email:');
  //     const email = await this.waitForText(conversation);

  //     await ctx.reply('Введите пароль:');
  //     const password = await this.waitForText(conversation);

  //     await ctx.reply('Введите ник в игре:');
  //     const nickname = await this.waitForText(conversation);

  //     const backupAnswer = await this.ask2FAStep(conversation, ctx);

  //     await ctx.reply(
  //       `✅ Email: ${email}\nПароль: ${password}\nНик: ${nickname}\n Backup code: ${backupAnswer.has2FA ? backupAnswer.backupCode : 'Нет'}\n\nВсе верно?`,
  //       {
  //         reply_markup: new Keyboard()
  //           .text('Да')
  //           .text('Прервать')
  //           .resized()
  //           .oneTime(),
  //       },
  //     );

  //     const confirmText = await this.waitForText(conversation);
  //     if (confirmText.toLowerCase() !== 'да') {
  //       await ctx.reply('Попробуйте ещё раз');
  //       session.topupData = null;
  //       return;
  //     }

  //     if (!session.topupData) return;

  //     const topupReqData: ITopupCheckRequest = {
  //       account: email,
  //       password,
  //       nickname,
  //       retail_price: session.topupData.retailPrice,
  //       backupcode: backupAnswer.has2FA ? backupAnswer.backupCode : undefined,
  //       region: 'Any',
  //       product_id: session.topupData.productId,
  //     };

  //     const res = await conversation.external(async () => {
  //       const { data } =
  //         await this.httpClientService.payDigitalInstance.post<ITopupCheckResponse>(
  //           PAY_DIGITAL_PAYMENT_ENDPOINTS.topupCheck,
  //           topupReqData,
  //         );
  //       return data;
  //     });

  //     await conversation.external(async () => {
  //       await this.orderService.create({
  //         type: 'TOPUP',
  //         status: 'NEW',
  //         amount: res.retail_price_rub,
  //         email,
  //         paymentId: res.sbp_uuid,
  //         user,
  //         items: '',
  //         cart: null,
  //       });
  //     });

  //     const keyboard = new InlineKeyboard();
  //     keyboard.url('Перейти к оплате', res.sbp_url);
  //     await ctx.reply(`Ссылка на оплату ${res.product}:`, {
  //       reply_markup: keyboard,
  //     });
  //   } catch (error) {
  //     console.log('[BUY_TOPUP_CONV]', error);
  //     if (error.message === 'Conversation cancelled') return;
  //     await ctx.reply('❌ Ошибка. Попробуйте ещё раз.');
  //   }
  // };

  public async ask2FAStep(
    conversation: Conversation,
    ctx: Context,
  ): Promise<{ has2FA: boolean; backupCode?: string }> {
    while (true) {
      await ctx.reply(
        'У вас включена двухфакторная аутентификация (2FA)?\n\nОтветьте: <b>Да</b> или <b>Нет</b>.',
        { parse_mode: 'HTML' },
      );

      const answer = (await this.waitForText(conversation)).toLowerCase();

      if (answer === 'да') {
        await ctx.reply(
          '🧩 Введите ваш <b>backup-код</b> — одноразовый код для входа',
          { parse_mode: 'HTML' },
        );
        const backupCode = await this.waitForText(conversation);
        return { has2FA: true, backupCode };
      }

      if (answer === 'нет') {
        return { has2FA: false };
      }

      await ctx.reply('⚠️ Пожалуйста, ответьте только “Да” или “Нет”.');
    }
  }

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
      if (!data.forms?.topup_fields) return;
      const topups = data.forms?.topup_fields?.find(
        (f) => f.name === 'product_id',
      );

      if (!topups || !topups.options) {
        return await ctx.reply(
          `❌ К сожалению, товар ${data.group} отсутствует`,
        );
      }

      await ctx.reply(
        '‼️ Вы можете прервать диалог в любой момент, отправив /cancel.',
      );

      const productKeyboard = new Keyboard();

      topups.options.forEach((topup, i) => {
        if (!topup.price) return;

        if (i % 2 === 0) {
          productKeyboard.row();
        }

        productKeyboard
          .text(
            topup.product + ' - ' + increasePriceByPercent(topup.price) + '₽',
          )
          .resized()
          .oneTime();
      });

      await ctx.reply('Выберите конкретный товар:', {
        reply_markup: productKeyboard,
      });

      const topupAnswer = await this.waitForText(conversation);

      const selectedProduct = topups.options.find(
        (o) =>
          o.product + ' - ' + increasePriceByPercent(o.price) + '₽' ===
          topupAnswer,
      );

      if (!selectedProduct) {
        await ctx.reply('❌ Пожалуйста, выберите товар из списка.');
        throw new Error('Conversation cancelled');
      }

      const dataResult: Record<string, string> = {};

      for (const f of data.forms.topup_fields) {
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

      const topupReqData: ITopupCheckRequest = {
        ...dataResult,
        retail_price: increasePriceByPercent(selectedProduct.price),
        product_id: selectedProduct.value,
      };

      console.log('topupReqData', topupReqData);

      const { data: res } =
        await this.httpClientService.payDigitalInstance.post<TTopupCheckResponse>(
          PAY_DIGITAL_PAYMENT_ENDPOINTS.topupCheck,
          topupReqData,
        );

      if (!res.status) {
        return await ctx.reply(`❌ Произошла ошибка: ${res.comment}`);
      }

      console.log('RES', res);

      await conversation.external(async () => {
        await this.orderService.create({
          type: 'TOPUP',
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
